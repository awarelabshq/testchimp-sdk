package org.trackedtests.sdk.be.java.spring;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import javax.annotation.PostConstruct;
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.util.*;
import java.util.logging.Logger;

import static org.trackedtests.sdk.be.java.spring.Constants.*;

@Component
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class HttpRequestCaptureFilter implements Filter {
    private static final Logger logger = Logger.getLogger(HttpRequestCaptureFilter.class.getName());
    public static final String SESSION_ID_SPAN_ATTRIBUTE = "aware.derived.session_id";

    @Value("${aware.request_body_capture.enabled:false}")
    private Boolean enableRequestCapture;

    @Value("${aware.response_body_capture.enabled:false}")
    private Boolean enableResponseCapture;

    @Value("${aware.sdk.enabled:true}")
    private Boolean enableAwareSdk;

    @Autowired(required = false)
    private IRequestCaptureConfig config;

    @Autowired
    private OpenTelemetry openTelemetry;

    @Autowired
    DefaultRequestCaptureConfig defaultRequestCaptureConfig;

    private ObjectMapper objectMapper = new ObjectMapper();

    public HttpRequestCaptureFilter() {
    }

    @PostConstruct
    public void init() {
        if (config == null) {
            logger.info("Setting the request capture config to default config.");
            config = defaultRequestCaptureConfig;
        }
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain) throws IOException, ServletException {
        if (!enableAwareSdk) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        Span span = Span.current();
        HttpServletRequest httpServletRequest = (HttpServletRequest) servletRequest;
        extractTrackingHeaders(httpServletRequest, span);

        if (!enableRequestCapture && !enableResponseCapture) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        Span requestFilerSpan = openTelemetry.getTracer("tracked-tests").spanBuilder("capture_request_body")
                .setParent(Context.current()).startSpan();
        Span responseFilterSpan = null;

        CachedRequestHttpServletRequest cachedRequestHttpServletRequest;
        HttpServletResponse responseToUse = (HttpServletResponse) servletResponse;
        CachedResponseHttpServletResponse cachedResponseHttpServletResponse = null;

        try (Scope scope = requestFilerSpan.makeCurrent()) {
            cachedRequestHttpServletRequest = new CachedRequestHttpServletRequest((HttpServletRequest) servletRequest);

            if (enableResponseCapture) {
                cachedResponseHttpServletResponse = new CachedResponseHttpServletResponse((HttpServletResponse) servletResponse);
                responseToUse = cachedResponseHttpServletResponse;
            }

            if (config != null && config.getIgnoredUriPatterns() != null) {
                List<String> ignoredUriPatterns = config.getIgnoredUriPatterns();
                for (String ignoredPattern : ignoredUriPatterns) {
                    if (((HttpServletRequest) cachedRequestHttpServletRequest).getRequestURI()
                            .matches(ignoredPattern)) {
                        requestFilerSpan.end();
                        chain.doFilter(cachedRequestHttpServletRequest, servletResponse);
                        return;
                    }
                }
            }

            String protocol = httpServletRequest.getHeader("X-Forwarded-Proto");
            if (protocol == null) {
                protocol = httpServletRequest.getScheme();
            }
            String completeUrl = protocol + "://" + httpServletRequest.getServerName() + httpServletRequest.getRequestURI();
            span.setAttribute(SELF_HTTP_URL_SPAN_ATTRIBUTE, completeUrl);

            String requestBody = getBody(cachedRequestHttpServletRequest);
            Map<String, String> requestHeaders = getRequestHeaders(cachedRequestHttpServletRequest);

            if (config != null && config.getExtractorMap() != null) {
                NavigableSet<String> uriPatterns = config.getExtractorMap().navigableKeySet();
                for (String uriPattern : uriPatterns) {
                    if (cachedRequestHttpServletRequest.getRequestURI().matches(uriPattern)) {
                        IExtractor extractor = config.getExtractorMap().get(uriPattern);
                        ExtractResult extractResult = extractor.extractFromRequest(httpServletRequest.getRequestURI(), requestBody, requestHeaders);
                        requestBody = extractResult.sanitizedBody;
                        requestHeaders = extractResult.sanitizedHeaderMap;
                        Map<String, String> spanAttribs = extractResult.spanAttributes;
                        for (Map.Entry<String, String> entry : spanAttribs.entrySet()) {
                            span.setAttribute(entry.getKey(), entry.getValue());
                        }
                        if (span != null) {
                            if (requestBody != null) {
                                span.setAttribute(REQUEST_BODY_SPAN_ATTRIBUTE, requestBody);
                            }
                            if (requestHeaders != null) {
                                span.setAttribute(REQUEST_HEADERS_SPAN_ATTRIBUTE, objectMapper.writeValueAsString(requestHeaders));
                            }
                        }
                        break;
                    }
                }
            }


        } finally {
            requestFilerSpan.end();
        }


        chain.doFilter(cachedRequestHttpServletRequest, responseToUse);

        if (enableResponseCapture) {
            responseFilterSpan = openTelemetry.getTracer("tracked-tests").spanBuilder("capture_response_body")
                    .setParent(Context.current()).startSpan();
            try (Scope responseScope = responseFilterSpan.makeCurrent()) {
                String responseBody = cachedResponseHttpServletResponse.getResponseBody();
                Map<String, String> responseHeaders = cachedResponseHttpServletResponse.getResponseHeaders();

                if (config != null && config.getExtractorMap() != null) {
                    NavigableSet<String> uriPatterns = config.getExtractorMap().navigableKeySet();
                    for (String uriPattern : uriPatterns) {
                        if (cachedRequestHttpServletRequest.getRequestURI().matches(uriPattern)) {
                            IExtractor extractor = config.getExtractorMap().get(uriPattern);
                            ExtractResult extractResult = extractor.extractFromResponse(httpServletRequest.getRequestURI(), responseBody, responseHeaders);
                            responseBody = extractResult.sanitizedBody;
                            responseHeaders = extractResult.sanitizedHeaderMap;
                            Map<String, String> spanAttribs = extractResult.spanAttributes;
                            for (Map.Entry<String, String> entry : spanAttribs.entrySet()) {
                                span.setAttribute(entry.getKey(), entry.getValue());
                            }
                            if (span != null) {
                                if (responseBody != null) {
                                    span.setAttribute(RESPONSE_BODY_SPAN_ATTRIBUTE, responseBody);
                                }
                                if (responseHeaders != null) {
                                    span.setAttribute(REQUEST_HEADERS_SPAN_ATTRIBUTE, objectMapper.writeValueAsString(responseHeaders));
                                }
                            }
                            break;
                        }
                    }
                }

            } finally {
                if (responseFilterSpan != null) {
                    responseFilterSpan.end();
                }
            }
        }
    }

    private static void extractTrackingHeaders(HttpServletRequest httpServletRequest, Span span) {
        String trackedTestSuite = httpServletRequest.getHeader(TRACKED_TEST_SUITE_HEADER_KEY);
        String trackedTestCase = httpServletRequest.getHeader(TRACKED_TEST_NAME_HEADER_KEY);
        String trackedTestType = httpServletRequest.getHeader(TRACKED_TEST_TYPE_HEADER_KEY);
        String headerExtractedSessionRecordingTrackingId = httpServletRequest.getHeader(AWARE_SESSION_RECORDING_TRACKING_ID_HEADER_KEY);
        Cookie[] cookies = httpServletRequest.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals(AWARE_SESSION_RECORD_TRACKING_ID_COOKIE_NAME)) {
                    span.setAttribute(HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, cookie.getValue());
                    break;
                }
            }
        }
        if (headerExtractedSessionRecordingTrackingId != null && !headerExtractedSessionRecordingTrackingId.isEmpty()) {
            logger.info("Header extracted tracking id found " + headerExtractedSessionRecordingTrackingId);
            span.setAttribute(HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, headerExtractedSessionRecordingTrackingId);
        }
        if (trackedTestSuite != null && !trackedTestSuite.isEmpty()) {
            span.setAttribute(HEADER_EXTRACTED_PREFIX + TRACKED_TEST_SUITE_HEADER_KEY, trackedTestSuite);
        }
        if (trackedTestCase != null && !trackedTestCase.isEmpty()) {
            span.setAttribute(HEADER_EXTRACTED_PREFIX + TRACKED_TEST_NAME_HEADER_KEY, trackedTestCase);
        }
        if (trackedTestType != null && !trackedTestType.isEmpty()) {
            span.setAttribute(HEADER_EXTRACTED_PREFIX + TRACKED_TEST_TYPE_HEADER_KEY, trackedTestType);
        }
        String sessionId = extractSessionId(httpServletRequest.getHeader("cookie"));
        if (sessionId != null && !sessionId.isEmpty()) {
            span.setAttribute(SESSION_ID_SPAN_ATTRIBUTE, sessionId);
        }
    }

    private static String extractSessionId(String cookies) {
        if (cookies == null || cookies.isEmpty()) {
            return null;
        }

        // Split the cookies string into individual cookies
        String[] cookieParts = cookies.split(";");

        // Iterate over each cookie part to find the session ID
        for (String cookiePart : cookieParts) {
            // Trim the cookie part to remove leading and trailing whitespace
            String trimmedCookiePart = cookiePart.trim();

            // Check if the cookie part contains an '=' sign indicating a key-value pair
            if (trimmedCookiePart.contains("=")) {
                // Split the cookie part into key and value
                String[] keyValue = trimmedCookiePart.split("=");

                // Check if the key is one of the commonly used session ID cookie names
                String key = keyValue[0].trim();
                if (key.equalsIgnoreCase("sessionid") || key.equalsIgnoreCase("JSESSIONID") || key.equalsIgnoreCase("PHPSESSID")) {
                    // If found, return the session ID value
                    return keyValue[1].trim();
                }
            }
        }

        // If no session ID cookie is found, return null
        return null;
    }

    private Map<String, String> getRequestHeaders(HttpServletRequest request) {
        Map<String, String> headersMap = new HashMap<>();
        Enumeration<String> headerEnumeration = request.getHeaderNames();
        while (headerEnumeration.hasMoreElements()) {
            String header = headerEnumeration.nextElement();
            if (config.getIgnoredHeaders().stream()
                    .noneMatch(h -> h.toLowerCase().contains(header.toLowerCase()) || header.toLowerCase()
                            .contains(h.toLowerCase()))) {
                headersMap.put(header.toLowerCase(), request.getHeader(header));
            }
        }
        return headersMap;
    }

    private String getBody(CachedRequestHttpServletRequest request) throws IOException {
        StringBuilder body = new StringBuilder();
        String line;
        BufferedReader reader = request.getReader();
        while ((line = reader.readLine()) != null) {
            body.append(line);
        }
        return body.toString();
    }

    private static class CachedRequestHttpServletRequest extends HttpServletRequestWrapper {
        private byte[] cachedBody;

        public CachedRequestHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            this.cachedBody = StreamUtils.copyToByteArray(request.getInputStream());
        }


        @Override
        public ServletInputStream getInputStream() {
            return new CachedRequestServletInputStream(this.cachedBody);
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(new ByteArrayInputStream(this.cachedBody)));
        }
    }

    private static class CachedRequestServletInputStream extends ServletInputStream {
        private InputStream cachedBodyInputStream;

        public CachedRequestServletInputStream(byte[] cachedBody) {
            this.cachedBodyInputStream = new ByteArrayInputStream(cachedBody);
        }

        @Override
        public boolean isFinished() {
            try {
                return cachedBodyInputStream.available() == 0;
            } catch (IOException e) {
                e.printStackTrace();
            }
            return false;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            throw new UnsupportedOperationException();
        }

        @Override
        public int read() throws IOException {
            return cachedBodyInputStream.read();
        }
    }

    private static class CachedResponseHttpServletResponse extends HttpServletResponseWrapper {
        private ByteArrayOutputStream cachedResponse = new ByteArrayOutputStream();
        private PrintWriter cachedWriter = new PrintWriter(cachedResponse, true);

        public CachedResponseHttpServletResponse(HttpServletResponse response) {
            super(response);
        }

        @Override
        public ServletOutputStream getOutputStream() throws IOException {
            return new FilterServletOutputStream(super.getOutputStream(), cachedResponse);
        }

        @Override
        public PrintWriter getWriter() {
            return cachedWriter;
        }

        public String getResponseBody() {
            return cachedResponse.toString();
        }

        public Map<String, String> getResponseHeaders() {
            Map<String, String> headersMap = new HashMap<>();
            Collection<String> headerNames = getHeaderNames();
            for (String headerName : headerNames) {
                headersMap.put(headerName, getHeader(headerName));
            }
            return headersMap;
        }
    }

    private static class FilterServletOutputStream extends ServletOutputStream {
        private ServletOutputStream originalStream;
        private ByteArrayOutputStream cachedResponse;

        public FilterServletOutputStream(ServletOutputStream originalStream, ByteArrayOutputStream cachedResponse) {
            this.originalStream = originalStream;
            this.cachedResponse = cachedResponse;
        }

        @Override
        public void write(int b) throws IOException {
            cachedResponse.write(b);
            originalStream.write(b);
        }

        @Override
        public void write(byte[] b) throws IOException {
            cachedResponse.write(b);
            originalStream.write(b);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            cachedResponse.write(b, off, len);
            originalStream.write(b, off, len);
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setWriteListener(WriteListener writeListener) {
            throw new UnsupportedOperationException();
        }
    }
}