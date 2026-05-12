package com.adkstvite.core.models.travel;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.annotation.PostConstruct;
import javax.servlet.http.Cookie;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.SlingObject;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = { SlingHttpServletRequest.class,
        Resource.class }, defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL)
public class TravelHeaderModel {

    private static final String COOKIE_ACCESS = "adv_access_token";
    private static final Pattern LOCALE_PATTERN = Pattern.compile("/content/adkstvite/([a-z]{2})/([a-z]{2})/");

    @SlingObject
    private SlingHttpServletRequest request;

    @SlingObject
    private Resource resource;

    @ValueMapValue
    private String brandName;
    @ValueMapValue
    private String brandHref;
    @ValueMapValue
    private String signInLabel;
    @ValueMapValue
    private String signInHref;
    @ValueMapValue
    private String registerLabel;
    @ValueMapValue
    private String registerHref;

    private String navItemsJson;
    private boolean authenticated;
    private String displayName;
    private String currentLocale;
    private String localesJson;

    @PostConstruct
    protected void init() {
        resolveAuthState();
        resolveLocale();

        // Attempt to resolve the locale-specific XF header-mount to get translated
        // labels.
        // The Core XF locale auto-swap is bypassed intentionally because the template
        // structure locks the fragmentVariationPath to us/en and the automatic swap
        // does not fire reliably in this project setup.
        Resource headerSource = resolveLocaleHeaderResource();
        if (headerSource != null) {
            ValueMap vm = headerSource.getValueMap();
            if (vm.containsKey("brandName"))
                brandName = vm.get("brandName", String.class);
            if (vm.containsKey("brandHref"))
                brandHref = vm.get("brandHref", String.class);
            if (vm.containsKey("signInLabel"))
                signInLabel = vm.get("signInLabel", String.class);
            if (vm.containsKey("signInHref"))
                signInHref = vm.get("signInHref", String.class);
            if (vm.containsKey("registerLabel"))
                registerLabel = vm.get("registerLabel", String.class);
            if (vm.containsKey("registerHref"))
                registerHref = vm.get("registerHref", String.class);
        }

        Resource navSource = (headerSource != null) ? headerSource : resource;
        List<String> items = new ArrayList<>();
        Resource navRes = navSource.getChild("navItems");
        if (navRes != null) {
            Iterator<Resource> iter = navRes.listChildren();
            while (iter.hasNext()) {
                Resource child = iter.next();
                ValueMap vm = child.getValueMap();
                items.add(buildLinkJson(vm.get("label", ""), vm.get("href", "")));
            }
        }
        if (items.isEmpty()) {
            Resource fallbackNav = resource.getChild("navItems");
            if (fallbackNav != null) {
                Iterator<Resource> iter = fallbackNav.listChildren();
                while (iter.hasNext()) {
                    Resource child = iter.next();
                    ValueMap vm = child.getValueMap();
                    items.add(buildLinkJson(vm.get("label", ""), vm.get("href", "")));
                }
            }
        }
        if (items.isEmpty()) {
            items.add(buildLinkJson("Home", "/content/adkstvite/us/en/home.html"));
            items.add(buildLinkJson("About Us", "/content/adkstvite/us/en/about-us.html"));
        }
        navItemsJson = "[" + String.join(",", items) + "]";
    }

    /**
     * Resolves the header-mount component node from the locale-specific XF.
     * Returns null when the current locale is us/en (already injected correctly)
     * or when the resource cannot be found.
     */
    private Resource resolveLocaleHeaderResource() {
        if (resource == null || "us/en".equals(currentLocale)) {
            return null;
        }
        String xfPath = "/content/experience-fragments/adkstvite/"
                + currentLocale + "/site/header/master/jcr:content/root/header-mount";
        return resource.getResourceResolver().getResource(xfPath);
    }

    private void resolveLocale() {
        currentLocale = "us/en";
        if (request != null) {
            Matcher m = LOCALE_PATTERN.matcher(request.getRequestURI());
            if (m.find()) {
                currentLocale = m.group(1) + "/" + m.group(2);
            }
        }
        localesJson = "["
                + "{\"code\":\"us/en\",\"label\":\"EN\",\"displayName\":\"English\"}"
                + ",{\"code\":\"fr/fr\",\"label\":\"FR\",\"displayName\":\"Fran\u00e7ais\"}"
                + ",{\"code\":\"es/es\",\"label\":\"ES\",\"displayName\":\"Espa\u00f1ol\"}"
                + "]";
    }

    private static String buildLinkJson(String label, String href) {
        return "{\"label\":\"" + esc(label) + "\",\"href\":\"" + esc(href) + "\"}";
    }

    private void resolveAuthState() {
        if (request == null)
            return;
        Cookie[] cookies = request.getCookies();
        if (cookies == null)
            return;
        for (Cookie c : cookies) {
            if (COOKIE_ACCESS.equals(c.getName())) {
                decodeJwt(c.getValue());
                return;
            }
        }
    }

    /**
     * Decodes the JWT payload (middle segment, Base64url) and extracts
     * name/email + exp. No signature verification — the cookie is HttpOnly
     * and was set by our own servlet. Expiry check prevents stale display.
     */
    private void decodeJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2)
                return;
            // Base64url → Base64 standard (pad to multiple of 4)
            String b64 = parts[1].replace('-', '+').replace('_', '/');
            int mod = b64.length() % 4;
            if (mod == 2)
                b64 += "==";
            else if (mod == 3)
                b64 += "=";
            String payload = new String(Base64.getDecoder().decode(b64), StandardCharsets.UTF_8);

            // Extract exp — simple substring scan, no JSON library needed
            long exp = extractLong(payload, "\"exp\":");
            if (exp > 0 && System.currentTimeMillis() / 1000L > exp)
                return; // expired

            // Prefer name, fall back to nickname, then email
            String name = extractString(payload, "\"name\":");
            if (name == null || name.isEmpty())
                name = extractString(payload, "\"nickname\":");
            if (name == null || name.isEmpty())
                name = extractString(payload, "\"email\":");
            if (name != null && !name.isEmpty()) {
                authenticated = true;
                displayName = name;
            }
        } catch (Exception e) {
            // Malformed token — treat as unauthenticated
        }
    }

    /** Extracts a JSON string value: "key": "value" */
    private static String extractString(String json, String key) {
        int ki = json.indexOf(key);
        if (ki < 0)
            return null;
        int start = json.indexOf('"', ki + key.length());
        if (start < 0)
            return null;
        int end = json.indexOf('"', start + 1);
        if (end < 0)
            return null;
        return json.substring(start + 1, end);
    }

    /** Extracts a JSON numeric value: "key": 123456 */
    private static long extractLong(String json, String key) {
        int ki = json.indexOf(key);
        if (ki < 0)
            return -1;
        int start = ki + key.length();
        while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == ':'))
            start++;
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end)))
            end++;
        if (end == start)
            return -1;
        try {
            return Long.parseLong(json.substring(start, end));
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static String esc(String s) {
        if (s == null)
            return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r");
    }

    public String getBrandName() {
        return brandName != null ? brandName : "AdventureTrails";
    }

    public String getBrandHref() {
        return brandHref != null ? brandHref : "/content/adkstvite/us/en/home.html";
    }

    public String getSignInLabel() {
        return signInLabel != null ? signInLabel : "Sign In";
    }

    public String getSignInHref() {
        return signInHref != null ? signInHref : "/content/adkstvite/us/en/sign-in.html";
    }

    public String getRegisterLabel() {
        return registerLabel != null ? registerLabel : "Register";
    }

    public String getRegisterHref() {
        return registerHref != null ? registerHref : "/content/adkstvite/us/en/register.html";
    }

    public String getNavItemsJson() {
        return navItemsJson;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public String getDisplayName() {
        return displayName != null ? displayName : "";
    }

    public String getCurrentLocale() {
        return currentLocale != null ? currentLocale : "us/en";
    }

    public String getLocalesJson() {
        return localesJson;
    }
}
