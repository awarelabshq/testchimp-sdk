package org.trackedtests.sdk.be.java.spring;

import java.util.Map;

public interface IExtractor {

    // Return the sanitized request body, header map and span attributes to attach.
    ExtractResult extractFromRequest(String uri, String originalRequestBody, Map<String, String> originalHeaderMap);

    // Return the sanitized response body, header map and span attributes to attach.
    ExtractResult extractFromResponse(String uri, String originalRequestBody, Map<String, String> originalHeaderMap);
}
