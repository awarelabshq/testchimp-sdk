package org.trackedtests.sdk.be.java.spring;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TrackedTestsConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public IRequestCaptureConfig defaultRequestCaptureConfig() {
        return new DefaultRequestCaptureConfig();
    }
}