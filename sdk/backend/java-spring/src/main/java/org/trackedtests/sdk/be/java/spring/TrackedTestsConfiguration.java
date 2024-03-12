package org.trackedtests.sdk.be.java.spring;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
// No need of this. Use OTel config to add the http headers to be captured.
public class TrackedTestsConfiguration implements WebMvcConfigurer {


    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new TrackedTestsInterceptor());
    }

}