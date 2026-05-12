package com.adkstvite.core.auth;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.engine.EngineConstants;
import org.osgi.framework.Constants;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP rate limiter for authentication endpoints.
 *
 * Applies a sliding-window of 10 POST attempts per 5 minutes on
 * /login and /signup. Returns HTTP 429 with a JSON error body when
 * the limit is exceeded.
 *
 * X-Forwarded-For is trusted to extract the real client IP (AEMaaCS
 * sits behind a CDN that sets this header).
 */
@Component(service = Filter.class, property = {
        EngineConstants.SLING_FILTER_SCOPE + "=" + EngineConstants.FILTER_SCOPE_REQUEST,
        Constants.SERVICE_RANKING + ":Integer=1000"
})
public class AuthRateLimitFilter implements Filter {

    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MS = 5 * 60 * 1_000L; // 5 minutes

    /** Per-IP deque of timestamps (ms) within the current window. */
    private final ConcurrentHashMap<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof SlingHttpServletRequest) {
            SlingHttpServletRequest slingReq = (SlingHttpServletRequest) request;
            String uri = slingReq.getRequestURI();
            String method = slingReq.getMethod();
            if ("POST".equalsIgnoreCase(method)
                    && (uri.endsWith("/login") || uri.endsWith("/signup"))) {
                String ip = getClientIp(slingReq);
                if (isRateLimited(ip)) {
                    response.setContentType("application/json");
                    ((javax.servlet.http.HttpServletResponse) response).setStatus(429);
                    response.getWriter().write("{\"error\":\"too many attempts, please wait and try again\"}");
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }

    /**
     * Records the attempt and returns true if the IP has exceeded the window limit.
     * Sliding-window: drops timestamps older than WINDOW_MS before checking.
     */
    private boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = attempts.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            // evict entries outside the window
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_ATTEMPTS) {
                return true;
            }
            timestamps.addLast(now);
            return false;
        }
    }

    private static String getClientIp(SlingHttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            // First value is the originating client IP
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    @Override
    public void init(FilterConfig config) {
        /* no-op */ }

    @Override
    public void destroy() {
        /* no-op */ }
}
