package org.aware.sdk.be.java.spring;

import java.io.ByteArrayOutputStream;
import java.util.Map;

public interface IExtractor {

    // Return the sanitized response body, header map and span attributes to attach.
    ExtractResult extractFromResponse(String requestUri, CachedResponseHttpServletResponse cachedResponseHttpServletResponse);

    ExtractResult extractFromRequest(CachedRequestHttpServletRequest cachedRequestHttpServletRequest);
}
