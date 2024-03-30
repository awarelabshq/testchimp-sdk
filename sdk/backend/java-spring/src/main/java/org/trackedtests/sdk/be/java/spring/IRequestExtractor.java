package org.trackedtests.sdk.be.java.spring;

import java.util.Map;

public interface IRequestExtractor {

    // Return the sanitized request body, header map and span attributes to attach.
    RequestExtractResult extract(String uri, String originalRequestBody, Map<String, String> originalHeaderMap);
}
