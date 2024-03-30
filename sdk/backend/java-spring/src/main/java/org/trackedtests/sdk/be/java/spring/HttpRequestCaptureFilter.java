package org.trackedtests.sdk.be.java.spring;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import java.io.*;
import java.util.*;
import java.util.logging.Logger;

import static org.trackedtests.sdk.be.java.spring.Constants.*;


@Component
@Order(value = Ordered.HIGHEST_PRECEDENCE)
public class HttpRequestCaptureFilter implements Filter {
    private static final Logger logger = Logger.getLogger(HttpRequestCaptureFilter.class.getName());

    @Autowired(required = false)
    private IRequestCaptureConfig config;

    @Autowired
    private OpenTelemetry openTelemetry;


    public HttpRequestCaptureFilter() {

    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain) throws IOException, ServletException {
        Span span = Span.current();
        Span filterSpan = openTelemetry.getTracer("tracked-tests").spanBuilder("capture_request_body")
                .setParent(Context.current()).startSpan();
        CachedRequestHttpServletRequest cachedRequestHttpServletRequest;
        try (Scope scope = filterSpan.makeCurrent()) {
            cachedRequestHttpServletRequest =
                    new CachedRequestHttpServletRequest((HttpServletRequest) servletRequest);
            if (config != null && config.getIgnoredUriPatterns() != null) {
                List<String> ignoredUriPatterns = config.getIgnoredUriPatterns();
                for (String ignoredPattern : ignoredUriPatterns) {
                    if (((HttpServletRequest) cachedRequestHttpServletRequest).getRequestURI()
                            .matches(ignoredPattern)) {
                        filterSpan.end();
                        chain.doFilter(cachedRequestHttpServletRequest, servletResponse);
                        return;
                    }
                }
            }
            String uri = ((HttpServletRequest) servletRequest).getRequestURL().toString().split("\\?")[0];
            span.setAttribute(SELF_HTTP_URL_SPAN_ATTRIBUTE, uri);

            String body = getBody(cachedRequestHttpServletRequest);
            Map<String, String> headers = getRequestHeaders(cachedRequestHttpServletRequest);
            if (config != null && config.getRequestExtractorMap() != null) {
                NavigableSet<String> uriPatterns = config.getRequestExtractorMap().navigableKeySet();
                for (String uriPattern : uriPatterns) {
                    if (cachedRequestHttpServletRequest.getRequestURI().matches(uriPattern)) {
                        IRequestExtractor extractor = config.getRequestExtractorMap().get(uriPattern);
                        RequestExtractResult extractResult = extractor.extract(uri,body, headers);
                        body = extractResult.sanitizedRequestBody;
                        headers = extractResult.sanitizedHeaderMap;
                        break;
                    }
                }
            }
            ObjectMapper objectMapper = new ObjectMapper();
            if (span != null) {
                if (body != null) {
                    span.setAttribute(REQUEST_BODY_SPAN_ATTRIBUTE, body);
                }
                if (headers != null) {
                    span.setAttribute(REQUEST_HEADERS_SPAN_ATTRIBUTE, objectMapper.writeValueAsString(headers));
                }
            }
        } finally {
            filterSpan.end();
        }
        chain.doFilter(cachedRequestHttpServletRequest, servletResponse);
    }

    private Map<String, String> getRequestHeaders(HttpServletRequest request) {
        Map<String, String> headersMap = new HashMap<>();
        Enumeration<String> headerEnumeration = request.getHeaderNames();
        while (headerEnumeration.hasMoreElements()) {
            String header = headerEnumeration.nextElement();

            if (config.getIgnoredHeaders().stream().noneMatch(h -> h.toLowerCase().contains(header.toLowerCase())
                    || header.toLowerCase().contains(h.toLowerCase()))) {
                headersMap.put(header, request.getHeader(header));
            }
        }
        return headersMap;
    }

    private String getBody(CachedRequestHttpServletRequest request) throws IOException {
        StringBuilder body = new StringBuilder();
        String line;
        BufferedReader reader = request.getReader();
        while ((line = reader.readLine()) != null) {
            body.append(line);
        }
        return body.toString();
    }

    private static class CachedRequestHttpServletRequest extends HttpServletRequestWrapper {

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
    }

    private static class CachedRequestServletInputStream extends ServletInputStream {

        private InputStream cachedBodyInputStream;

        public CachedRequestServletInputStream(byte[] cachedBody) {
            this.cachedBodyInputStream = new ByteArrayInputStream(cachedBody);
        }

        @Override
        public boolean isFinished() {
            try {
                return cachedBodyInputStream.available() == 0;
            } catch (IOException e) {
                e.printStackTrace();
            }
            return false;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            throw new UnsupportedOperationException();
        }

        @Override
        public int read() throws IOException {
            return cachedBodyInputStream.read();
        }
    }
}
