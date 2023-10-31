package org.trackedtests.sdk.be.java.spring;

import io.opentelemetry.api.trace.Span;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.logging.Level;
import java.util.logging.Logger;

@Component
public class TrackedTestsInterceptor implements HandlerInterceptor {
    private static final Logger logger = Logger.getLogger(TrackedTestsInterceptor.class.getName());

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) {
        try {
            String testSuite = request.getHeader(Constants.TRACKED_TEST_SUITE_ATTRIBUTE);
            String testName = request.getHeader(Constants.TRACKED_TEST_NAME_ATTRIBUTE);
            String testInvocationId = request.getHeader(Constants.TRACKED_TEST_INVOCATION_ID_ATTRIBUTE);
            String testType = request.getHeader(Constants.TRACKED_TEST_TYPE_ATTRIBUTE);
            if (testSuite != null) {
                Span span = Span.current();
                span.setAttribute(Constants.TRACKED_TEST_SUITE_ATTRIBUTE, testSuite);
            }
            if (testName != null) {
                Span span = Span.current();
                span.setAttribute(Constants.TRACKED_TEST_NAME_ATTRIBUTE, testName);
            }
            if (testInvocationId != null) {
                Span span = Span.current();
                span.setAttribute(Constants.TRACKED_TEST_INVOCATION_ID_ATTRIBUTE, testInvocationId);
            }
            if (testType != null) {
                Span span = Span.current();
                span.setAttribute(Constants.TRACKED_TEST_TYPE_ATTRIBUTE, testType);
            }
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Error occurred in TrackedTestsInterceptor", e);
        }
    }

}