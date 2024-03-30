package org.trackedtests.sdk.be.java.spring;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Interface that should be implemented and wired as a bean configuring the behaviour of the request capture filter.
 */
public interface IRequestCaptureConfig {

    // Should return a list of headers to ignore when writing to Span.
    List<String> getIgnoredHeaders();

    // Should return a list of uri patterns to ignore. Requests received for urls matching those patterns will not be captured.
    List<String> getIgnoredUriPatterns();

    // Should return a map of uri -> extractor objects.
    TreeMap<String, IRequestExtractor> getRequestExtractorMap();

}
