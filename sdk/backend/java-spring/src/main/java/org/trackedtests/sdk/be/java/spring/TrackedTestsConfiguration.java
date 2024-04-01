package org.trackedtests.sdk.be.java.spring;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@AutoConfiguration
@ComponentScan(basePackages = {"org.trackedtests.sdk.be.java.spring"})
public class TrackedTestsConfiguration {

}