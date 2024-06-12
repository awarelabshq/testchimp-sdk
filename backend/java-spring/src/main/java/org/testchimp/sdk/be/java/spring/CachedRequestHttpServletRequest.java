package org.testchimp.sdk.be.java.spring;

import lombok.SneakyThrows;
import org.springframework.util.StreamUtils;

import javax.servlet.ServletInputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

public class CachedRequestHttpServletRequest extends HttpServletRequestWrapper {
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

    public Map<String, String> getRequestHeaders() {
        Map<String, String> headersMap = new HashMap<>();
        Enumeration<String> headerEnumeration = this.getHeaderNames();
        while (headerEnumeration.hasMoreElements()) {
            String header = headerEnumeration.nextElement();
            headersMap.put(header.toLowerCase(), this.getHeader(header));
        }
        return headersMap;
    }

    @SneakyThrows
    public String getBodyString() {
        StringBuilder body = new StringBuilder();
        String line;
        BufferedReader reader = this.getReader();
        while ((line = reader.readLine()) != null) {
            body.append(line);
        }
        return body.toString();
    }
}
