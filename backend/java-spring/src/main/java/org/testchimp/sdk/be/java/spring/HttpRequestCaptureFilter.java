package org.testchimp.sdk.be.java.spring;

import com.google.protobuf.util.JsonFormat;
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

import javax.annotation.PostConstruct;
import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import java.util.*;
import java.util.logging.Logger;

import static org.testchimp.sdk.be.java.spring.Constants.REQUEST_PAYLOAD_SPAN_ATTRIBUTE;
import static org.testchimp.sdk.be.java.spring.Constants.RESPONSE_PAYLOAD_SPAN_ATTRIBUTE;

@Component
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class HttpRequestCaptureFilter implements Filter {
    private static final Logger logger = Logger.getLogger(HttpRequestCaptureFilter.class.getName());
    public static final String SESSION_ID_SPAN_ATTRIBUTE = "testchimp.derived.session_id";

    @Value("${testchimp.request_body_capture.enabled:true}")
    private Boolean enableRequestCapture;

    @Value("${testchimp.response_body_capture.enabled:true}")
    private Boolean enableResponseCapture;

    @Value("${testchimp.sdk.enabled:true}")
    private Boolean enableSdk;

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
        if (!enableSdk) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }
        Span span = Span.current();
        String spanId = span.getSpanContext().getSpanId();
        HttpServletRequest httpServletRequest = (HttpServletRequest) servletRequest;
        extractTrackingHeaders(httpServletRequest, span);

        if (!enableRequestCapture && !enableResponseCapture) {
            chain.doFilter(servletRequest, servletResponse);
            return;
        }

        Span requestFilerSpan = openTelemetry.getTracer("testchimp-sdk").spanBuilder("capture_request_body")
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
            span.setAttribute(Constants.SELF_HTTP_URL_SPAN_ATTRIBUTE, completeUrl);

            if (config != null && config.getExtractorMap() != null) {
                NavigableSet<String> uriPatterns = config.getExtractorMap().navigableKeySet();
                for (String uriPattern : uriPatterns) {
                    if (cachedRequestHttpServletRequest.getRequestURI().matches(uriPattern)) {
                        IExtractor extractor = config.getExtractorMap().get(uriPattern);
                        ExtractResult extractResult = extractor.extractFromRequest(cachedRequestHttpServletRequest);
                        Map<String, String> spanAttribs = extractResult.spanAttributes;
                        for (Map.Entry<String, String> entry : spanAttribs.entrySet()) {
                            logger.fine("Setting span attribute from request : " + entry.getKey() + " : " + entry.getValue());
                            span.setAttribute(entry.getKey(), entry.getValue());
                        }
                        if (span != null) {
                            if (extractResult.sanitizedPayload.isInitialized()) {
                                span.setAttribute(REQUEST_PAYLOAD_SPAN_ATTRIBUTE, JsonFormat.printer()
                                        .print(extractResult.sanitizedPayload.toBuilder().setSpanId(spanId).build()));
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
            responseFilterSpan = openTelemetry.getTracer("testchimp-sdk").spanBuilder("capture_response_body")
                    .setParent(Context.current()).startSpan();
            try (Scope responseScope = responseFilterSpan.makeCurrent()) {
                if (config != null && config.getExtractorMap() != null) {
                    NavigableSet<String> uriPatterns = config.getExtractorMap().navigableKeySet();
                    for (String uriPattern : uriPatterns) {
                        if (cachedRequestHttpServletRequest.getRequestURI().matches(uriPattern)) {
                            IExtractor extractor = config.getExtractorMap().get(uriPattern);
                            ExtractResult extractResult = extractor.extractFromResponse(httpServletRequest.getRequestURI(), cachedResponseHttpServletResponse);
                            Map<String, String> spanAttribs = extractResult.spanAttributes;
                            for (Map.Entry<String, String> entry : spanAttribs.entrySet()) {
                                logger.fine("Setting span attribute from response : " + entry.getKey() + " : " + entry.getValue());
                                span.setAttribute(entry.getKey(), entry.getValue());
                            }
                            if (span != null) {
                                if (span != null) {
                                    if (extractResult.sanitizedPayload.isInitialized()) {
                                        span.setAttribute(RESPONSE_PAYLOAD_SPAN_ATTRIBUTE, JsonFormat.printer()
                                                .print(extractResult.sanitizedPayload.toBuilder().setSpanId(spanId)
                                                        .build()));
                                    }
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
        String trackedTestSuite = httpServletRequest.getHeader(Constants.TRACKED_TEST_SUITE_HEADER_KEY);
        String trackedTestCase = httpServletRequest.getHeader(Constants.TRACKED_TEST_NAME_HEADER_KEY);
        String trackedTestType = httpServletRequest.getHeader(Constants.TRACKED_TEST_TYPE_HEADER_KEY);
        String trackedTestInvocationId = httpServletRequest.getHeader(Constants.TRACKED_TEST_INVOCATION_ID_HEADER_KEY);
        String trackedTestStep = httpServletRequest.getHeader(Constants.TRACKED_TEST_STEP_HEADER_KEY);
        String headerExtractedSessionRecordingTrackingId = httpServletRequest.getHeader(Constants.TC_SESSION_RECORDING_TRACKING_ID_HEADER_KEY);
        String headerExtractedParentSessionRecordingTrackingId = httpServletRequest.getHeader(Constants.TC_PARENT_SESSION_RECORDING_TRACKING_ID_HEADER_KEY);
        String headerExtractedCurrentUserId = httpServletRequest.getHeader(Constants.TC_CURRENT_USER_ID_HEADER_KEY);
        Cookie[] cookies = httpServletRequest.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals(Constants.TC_SESSION_RECORD_TRACKING_ID_COOKIE_NAME)) {
                    span.setAttribute(Constants.HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, cookie.getValue());
                    break;
                }
                if (cookie.getName().equals(Constants.TC_PARENT_SESSION_RECORD_TRACKING_ID_COOKIE_NAME)) {
                    span.setAttribute(Constants.HEADER_EXTRACTED_PARENT_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, cookie.getValue());
                    break;
                }
            }
        }
        if (headerExtractedSessionRecordingTrackingId != null && !headerExtractedSessionRecordingTrackingId.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, headerExtractedSessionRecordingTrackingId);
        }
        if (headerExtractedParentSessionRecordingTrackingId != null && !headerExtractedParentSessionRecordingTrackingId.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_PARENT_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, headerExtractedParentSessionRecordingTrackingId);
        }
        if (headerExtractedCurrentUserId != null && !headerExtractedCurrentUserId.isEmpty()) {
            span.setAttribute(Constants.USER_ID_SPAN_ATTRIBUTE, headerExtractedCurrentUserId);
        }
        if (trackedTestSuite != null && !trackedTestSuite.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_SUITE_HEADER_KEY, trackedTestSuite);
        }
        if (trackedTestStep != null && !trackedTestStep.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_STEP_HEADER_KEY, trackedTestStep);
        }
        if (trackedTestCase != null && !trackedTestCase.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_NAME_HEADER_KEY, trackedTestCase);
        }
        if (trackedTestType != null && !trackedTestType.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_TYPE_HEADER_KEY, trackedTestType);
        }
        if (trackedTestInvocationId != null && !trackedTestInvocationId.isEmpty()) {
            span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_INVOCATION_ID_HEADER_KEY, trackedTestInvocationId);
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

}