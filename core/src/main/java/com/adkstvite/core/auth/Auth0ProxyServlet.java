package com.adkstvite.core.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.SlingAllMethodsServlet;
import org.apache.sling.servlets.annotations.SlingServletPaths;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Modified;
import org.osgi.service.metatype.annotations.Designate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.servlet.Servlet;
import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

/**
 * OSGi proxy servlet for Auth0 authentication. Production-hardened:
 *
 * <ul>
 * <li>Jackson ObjectMapper for safe JSON parsing (replaces hand-rolled
 * parser)</li>
 * <li>HttpOnly + Secure (HTTPS-only) + SameSite=Strict cookies</li>
 * <li>CSRF double-submit cookie pattern (_csrf non-HttpOnly + X-CSRF-Token
 * header)</li>
 * <li>Refresh token persisted in a second HttpOnly cookie (30-day expiry)</li>
 * <li>Rate limiting delegated to {@link AuthRateLimitFilter}</li>
 * </ul>
 *
 * Endpoints:
 * 
 * <pre>
 *   POST /bin/adkstvite/auth/login    – password grant → access + refresh cookies
 *   POST /bin/adkstvite/auth/signup   – DB signup → auto-login → cookies
 *   GET  /bin/adkstvite/auth/userinfo – cookie → Auth0 /userinfo → user JSON
 *   POST /bin/adkstvite/auth/refresh  – refresh cookie → new access cookie
 *   POST /bin/adkstvite/auth/logout   – clear all auth cookies
 *   GET  /bin/adkstvite/auth/csrf     – issue _csrf cookie, return {"status":"ok"}
 * </pre>
 */
@Component(service = Servlet.class)
@SlingServletPaths(value = {
        "/bin/adkstvite/auth/login",
        "/bin/adkstvite/auth/signup",
        "/bin/adkstvite/auth/logout",
        "/bin/adkstvite/auth/userinfo",
        "/bin/adkstvite/auth/refresh",
        "/bin/adkstvite/auth/csrf"
})
@Designate(ocd = Auth0Config.class)
public class Auth0ProxyServlet extends SlingAllMethodsServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(Auth0ProxyServlet.class);

    static final String COOKIE_ACCESS = "adv_access_token";
    static final String COOKIE_REFRESH = "adv_refresh_token";
    static final String COOKIE_CSRF = "_csrf";

    private static final int ACCESS_MAX_AGE = 3_600; // 1 hour
    private static final int REFRESH_MAX_AGE = 30 * 24 * 3_600; // 30 days

    private final ObjectMapper mapper = new ObjectMapper();
    private volatile Auth0Config config;
    private HttpClient httpClient;
    /** Key bytes used for HMAC-SHA256 CSRF token signing. */
    private volatile byte[] csrfKey;

    @Activate
    @Modified
    protected void activate(Auth0Config cfg) {
        this.config = cfg;
        this.httpClient = HttpClient.newBuilder().build();
        // Use the OAuth client secret as the CSRF signing key when it is a real
        // value. Fall back to a random per-startup key for local development
        // where $[secret:...] variables are not resolved.
        String secret = cfg.clientSecret();
        if (secret != null && !secret.isEmpty() && !secret.startsWith("$[")) {
            this.csrfKey = secret.getBytes(StandardCharsets.UTF_8);
        } else {
            byte[] randomKey = new byte[32];
            new SecureRandom().nextBytes(randomKey);
            this.csrfKey = randomKey;
            LOG.warn("Auth0Config.clientSecret is unset or unresolved; using a per-startup random CSRF key. "
                    + "CSRF tokens will be invalidated on AEM restart and won't work across cluster nodes.");
        }
    }

    // ── HTTP dispatch ─────────────────────────────────────────────────────────

    @Override
    protected void doGet(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws ServletException, IOException {
        String uri = req.getRequestURI();
        if (uri.endsWith("/csrf")) {
            // Always issue a fresh signed CSRF token and return it in the body so the
            // client can cache it in memory — no dependency on the cookie being sent back.
            String token = generateCsrfToken();
            setCookie(req, res, COOKIE_CSRF, token, REFRESH_MAX_AGE, false);
            sendJson(res, 200, mapper.createObjectNode()
                    .put("status", "ok")
                    .put("csrfToken", token));
        } else {
            ensureCsrf(req, res);
            if (uri.endsWith("/userinfo")) {
                handleUserInfo(req, res);
            } else {
                res.sendError(404);
            }
        }
    }

    @Override
    protected void doPost(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws ServletException, IOException {
        ensureCsrf(req, res);
        if (!verifyCsrf(req)) {
            sendJsonError(res, 403, "CSRF token mismatch");
            return;
        }
        String uri = req.getRequestURI();
        if (uri.endsWith("/login"))
            handleLogin(req, res);
        else if (uri.endsWith("/signup"))
            handleSignup(req, res);
        else if (uri.endsWith("/refresh"))
            handleRefresh(req, res);
        else if (uri.endsWith("/logout"))
            handleLogout(req, res);
        else
            res.sendError(404);
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    private void handleLogin(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws IOException {
        JsonNode body = parseBody(req);
        if (body == null || !body.hasNonNull("email") || !body.hasNonNull("password")) {
            sendJsonError(res, 400, "email and password are required");
            return;
        }
        String form = buildForm(
                "grant_type", "password",
                "username", body.get("email").asText(),
                "password", body.get("password").asText(),
                "audience", config.audience(),
                "scope", "openid profile email offline_access",
                "client_id", config.clientId(),
                "client_secret", config.clientSecret());
        try {
            HttpResponse<String> auth0 = postForm("/oauth/token", form);
            if (auth0.statusCode() == 200) {
                setAuthCookies(req, res, mapper.readTree(auth0.body()));
                sendJson(res, 200, mapper.createObjectNode().put("status", "ok"));
            } else {
                JsonNode errNode = mapper.readTree(auth0.body());
                String errCode = errNode.path("error").asText("");
                String msg;
                if ("access_denied".equals(errCode)) {
                    // Auth0 misconfiguration (password grant not enabled / no default directory).
                    // Don't leak the raw "Unauthorized" to the browser.
                    LOG.warn("Auth0 password grant rejected with access_denied — ensure the app has "
                            + "Password grant enabled and Tenant Default Directory is set.");
                    msg = "Sign-in is currently unavailable. Please try again later.";
                } else {
                    msg = errNode.path("error_description").asText("Invalid email or password.");
                }
                LOG.debug("Auth0 login rejected ({}) error={}", auth0.statusCode(), errCode);
                sendJsonError(res, 401, msg);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendJsonError(res, 500, "request interrupted");
        }
    }

    private void handleSignup(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws IOException {
        JsonNode body = parseBody(req);
        if (body == null || !body.hasNonNull("email") || !body.hasNonNull("password")) {
            sendJsonError(res, 400, "email and password are required");
            return;
        }
        ObjectNode signupPayload = mapper.createObjectNode()
                .put("client_id", config.clientId())
                .put("email", body.get("email").asText())
                .put("password", body.get("password").asText())
                .put("connection", config.connection());
        if (body.hasNonNull("firstName"))
            signupPayload.put("given_name", body.get("firstName").asText());
        if (body.hasNonNull("lastName"))
            signupPayload.put("family_name", body.get("lastName").asText());

        try {
            HttpResponse<String> signupRes = postJsonBody("/dbconnections/signup",
                    mapper.writeValueAsString(signupPayload));
            if (signupRes.statusCode() == 200) {
                // Auto-login: get tokens immediately so the user is signed in after signup.
                String form = buildForm(
                        "grant_type", "password",
                        "username", body.get("email").asText(),
                        "password", body.get("password").asText(),
                        "audience", config.audience(),
                        "scope", "openid profile email offline_access",
                        "client_id", config.clientId(),
                        "client_secret", config.clientSecret());
                HttpResponse<String> tokenRes = postForm("/oauth/token", form);
                boolean autoSignedIn = false;
                if (tokenRes.statusCode() == 200) {
                    setAuthCookies(req, res, mapper.readTree(tokenRes.body()));
                    autoSignedIn = true;
                } else {
                    LOG.debug("Auto-login after signup failed ({}); user must sign in manually",
                            tokenRes.statusCode());
                }
                sendJson(res, 200, mapper.createObjectNode()
                        .put("status", "ok")
                        .put("autoSignedIn", autoSignedIn));
            } else {
                JsonNode err = mapper.readTree(signupRes.body());
                // Auth0 uses 'description' for most errors; falls back to 'message', then
                // 'name'
                String msg = err.path("description").asText(
                        err.path("message").asText(
                                err.path("name").asText("Registration failed")));
                LOG.warn("Auth0 signup rejected ({}) body={}", signupRes.statusCode(), signupRes.body());
                sendJsonError(res, 400, msg);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendJsonError(res, 500, "request interrupted");
        }
    }

    private void handleUserInfo(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws IOException {
        String token = getCookieValue(req, COOKIE_ACCESS);
        if (token == null) {
            sendJsonError(res, 401, "unauthenticated");
            return;
        }
        HttpRequest auth0Req = HttpRequest.newBuilder()
                .uri(URI.create("https://" + config.domain() + "/userinfo"))
                .header("Authorization", "Bearer " + token)
                .GET().build();
        try {
            HttpResponse<String> auth0Res = httpClient.send(auth0Req, HttpResponse.BodyHandlers.ofString());
            if (auth0Res.statusCode() == 401) {
                clearAuthCookies(req, res);
                sendJsonError(res, 401, "unauthenticated");
                return;
            }
            res.setContentType("application/json");
            res.setCharacterEncoding("UTF-8");
            res.setStatus(auth0Res.statusCode());
            res.getWriter().write(auth0Res.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendJsonError(res, 500, "request interrupted");
        }
    }

    private void handleRefresh(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws IOException {
        String refreshToken = getCookieValue(req, COOKIE_REFRESH);
        if (refreshToken == null) {
            sendJsonError(res, 401, "no refresh token");
            return;
        }
        String form = buildForm(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken,
                "client_id", config.clientId(),
                "client_secret", config.clientSecret());
        try {
            HttpResponse<String> auth0Res = postForm("/oauth/token", form);
            if (auth0Res.statusCode() == 200) {
                setAuthCookies(req, res, mapper.readTree(auth0Res.body()));
                sendJson(res, 200, mapper.createObjectNode().put("status", "ok"));
            } else {
                clearAuthCookies(req, res);
                LOG.debug("Auth0 refresh rejected ({})", auth0Res.statusCode());
                sendJsonError(res, 401, "session expired, please sign in again");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendJsonError(res, 500, "request interrupted");
        }
    }

    private void handleLogout(SlingHttpServletRequest req, SlingHttpServletResponse res)
            throws IOException {
        clearAuthCookies(req, res);
        sendJson(res, 200, mapper.createObjectNode().put("status", "ok"));
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    private void setAuthCookies(SlingHttpServletRequest req, SlingHttpServletResponse res,
            JsonNode tokenNode) {
        String access = tokenNode.path("access_token").asText(null);
        String refresh = tokenNode.path("refresh_token").asText(null);
        if (access != null)
            setCookie(req, res, COOKIE_ACCESS, access, ACCESS_MAX_AGE, true);
        if (refresh != null)
            setCookie(req, res, COOKIE_REFRESH, refresh, REFRESH_MAX_AGE, true);
    }

    private void clearAuthCookies(SlingHttpServletRequest req, SlingHttpServletResponse res) {
        setCookie(req, res, COOKIE_ACCESS, "", 0, true);
        setCookie(req, res, COOKIE_REFRESH, "", 0, true);
    }

    /**
     * Writes a Set-Cookie header directly to support SameSite attribute
     * (the javax.servlet Cookie API has no setSameSite method).
     *
     * @param httpOnly true for auth tokens (no JS access); false for _csrf so JS
     *                 can read it
     */
    private void setCookie(SlingHttpServletRequest req, SlingHttpServletResponse res,
            String name, String value, int maxAge, boolean httpOnly) {
        StringBuilder sb = new StringBuilder()
                .append(name).append("=").append(value)
                .append("; SameSite=Strict; Path=/; Max-Age=").append(maxAge);
        if (httpOnly)
            sb.append("; HttpOnly");
        if (req.isSecure())
            sb.append("; Secure");
        res.addHeader("Set-Cookie", sb.toString());
    }

    private static String getCookieValue(SlingHttpServletRequest req, String name) {
        Cookie[] cookies = req.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if (name.equals(c.getName())) {
                    String v = c.getValue();
                    return (v != null && !v.isEmpty()) ? v : null;
                }
            }
        }
        return null;
    }

    // ── CSRF helpers ──────────────────────────────────────────────────────────

    /**
     * Issues a _csrf cookie if not already present (non-HttpOnly so JS can read
     * it). Cookie value is a signed HMAC token.
     */
    private void ensureCsrf(SlingHttpServletRequest req, SlingHttpServletResponse res) {
        if (getCookieValue(req, COOKIE_CSRF) == null) {
            setCookie(req, res, COOKIE_CSRF, generateCsrfToken(), REFRESH_MAX_AGE, false);
        }
    }

    /**
     * CSRF verification supporting two modes:
     * <ol>
     * <li><b>HMAC-signed token</b> (primary) — the {@code X-CSRF-Token} header
     * contains a signed token issued by {@link #generateCsrfToken()}. The
     * server verifies the HMAC without needing the cookie in the request.
     * This path works even when browsers suppress the {@code _csrf} cookie
     * (e.g. across Vite dev proxy hops).</li>
     * <li><b>Legacy double-submit</b> (fallback) — plain UUID header must equal
     * the {@code _csrf} cookie value (older clients).</li>
     * </ol>
     */
    private boolean verifyCsrf(SlingHttpServletRequest req) {
        String headerVal = req.getHeader("X-CSRF-Token");
        if (headerVal == null || headerVal.isEmpty())
            return false;
        // Primary: verify HMAC-signed token (no cookie dependency)
        if (verifyCsrfSignature(headerVal))
            return true;
        // Fallback: legacy double-submit cookie check
        String cookieVal = getCookieValue(req, COOKIE_CSRF);
        return cookieVal != null && cookieVal.equals(headerVal);
    }

    /**
     * Generates a CSRF token as
     * {@code <nonce>.<base64url(HMAC-SHA256(nonce, clientSecret))>}.
     * The token is verifiable server-side without any session state.
     */
    private String generateCsrfToken() {
        String nonce = UUID.randomUUID().toString();
        return nonce + "." + hmacSha256Base64(nonce);
    }

    /**
     * Returns {@code true} if {@code token} is a syntactically valid signed CSRF
     * token.
     */
    private boolean verifyCsrfSignature(String token) {
        int dot = token.lastIndexOf('.');
        if (dot < 1)
            return false;
        String nonce = token.substring(0, dot);
        String sig = token.substring(dot + 1);
        return hmacSha256Base64(nonce).equals(sig);
    }

    private String hmacSha256Base64(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(csrfKey, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private HttpResponse<String> postForm(String path, String body)
            throws IOException, InterruptedException {
        return httpClient.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("https://" + config.domain() + path))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> postJsonBody(String path, String body)
            throws IOException, InterruptedException {
        return httpClient.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("https://" + config.domain() + path))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode parseBody(SlingHttpServletRequest req) {
        try {
            return mapper.readTree(req.getInputStream());
        } catch (IOException e) {
            LOG.debug("Failed to parse request body as JSON", e);
            return null;
        }
    }

    private void sendJson(SlingHttpServletResponse res, int status, JsonNode node)
            throws IOException {
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        res.setStatus(status);
        mapper.writeValue(res.getWriter(), node);
    }

    private void sendJsonError(SlingHttpServletResponse res, int status, String message)
            throws IOException {
        sendJson(res, status, mapper.createObjectNode().put("error", message));
    }

    /** Builds a URL-encoded form body from alternating key-value pairs. */
    private static String buildForm(String... kvPairs) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < kvPairs.length - 1; i += 2) {
            if (i > 0)
                sb.append('&');
            sb.append(URLEncoder.encode(kvPairs[i], StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(kvPairs[i + 1] != null ? kvPairs[i + 1] : "",
                            StandardCharsets.UTF_8));
        }
        return sb.toString();
    }
}
