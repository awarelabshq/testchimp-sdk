package org.trackedtests.sdk.be.java.spring;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class DefaultRequestCaptureConfig implements IRequestCaptureConfig {

    /* Just to avoid logging credentials or related details. You can empty this list or remove it completely if you
    want to log the security details too. */
    private static List<String> HEADERS_TO_SKIP = Arrays.asList("authorization", "token", "security", "oauth", "auth");

    // Ignoring typical health check, static assets uris.
    private static List<String> URI_PATTERNS_TO_IGNORE = Arrays.asList(".*/health/check", ".*/actuator/.*", ".*/static/.*", ".*/assets/.*", ".*/resources/.*");

    @Override
    public List<String> getIgnoredHeaders() {
        return HEADERS_TO_SKIP;
    }

    @Override
    public List<String> getIgnoredUriPatterns() {
        return URI_PATTERNS_TO_IGNORE;
    }

    @Override
    public TreeMap<String, IRequestExtractor> getRequestExtractorMap() {
        TreeMap<String, IRequestExtractor> extractorMap = new TreeMap<>();
        extractorMap.put(".*", new DefaultRequestExtractor());
        return extractorMap;
    }

    public void setHeadersToSkip(List<String> headersToSkip) {
        HEADERS_TO_SKIP = headersToSkip;
    }

    public void setUriPatternsToSkip(List<String> uriPatternsToSkip) {
        URI_PATTERNS_TO_IGNORE = uriPatternsToSkip;
    }
}
