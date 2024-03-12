package org.trackedtests.sdk.be.java.spring;

import java.util.Map;

public interface IRequestSanitizer {

    String getSanitizedBody(String originalRequestBody);

    Map<String, String> getSanitizedHeadersMap(Map<String, String> originalHeaderMap);
}
