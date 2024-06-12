package org.testchimp.sdk.be.java.spring;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class CachedResponseHttpServletResponse extends HttpServletResponseWrapper {
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

    public String getBodyString() {
        return cachedResponse.toString();
    }

    public ByteArrayOutputStream getRawResponse() {
        return cachedResponse;
    }

    public Map<String, String> getResponseHeaders() {
        Map<String, String> headersMap = new HashMap<>();
        Collection<String> headerNames = getHeaderNames();
        for (String headerName : headerNames) {
            headersMap.put(headerName.toLowerCase(), getHeader(headerName));
        }
        return headersMap;
    }


}