package org.testchimp.sdk.be.java.spring;

public interface IExtractor {

    // Return the sanitized response body, header map and span attributes to attach.
    ExtractResult extractFromResponse(String requestUri, CachedResponseHttpServletResponse cachedResponseHttpServletResponse);

    ExtractResult extractFromRequest(CachedRequestHttpServletRequest cachedRequestHttpServletRequest);
}
