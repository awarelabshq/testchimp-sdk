package org.trackedtests.sdk.be.java.spring;

import java.util.Enumeration;
import java.util.logging.Logger;


import io.opentelemetry.api.trace.Span;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Component
public class TrackedTestsInterceptor implements HandlerInterceptor {
    private static final Logger logger = Logger.getLogger(TrackedTestsInterceptor.class.getName());

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
        logger.info("Invoking tracked test interceptor");
        if (request.getRequestURI().contains("get_detailed_user_info")) {
            Enumeration<String> headers = request.getHeaderNames();
            while (headers.hasMoreElements()) {
                String header = headers.nextElement();
                logger.info("header: " + header + " " + request.getHeader(header));
            }
        }
        String testHeader = request.getHeader("trackedtest.name");
        if (testHeader != null) {
            Span span = Span.current();
            span.setAttribute("trackedtest.name", testHeader);
        }
    }

}