package org.trackedtests.automation.selenium.java.testng;

import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;

@Aspect
public class TrackedTestAspect {
    private TrackedTestHelper trackedTestHelper;

    public TrackedTestAspect() {
        this.trackedTestHelper = new TrackedTestHelper();
    }

    @Pointcut("@within(org.trackedtests.automation.selenium.java.testng.TrackedTest) && @annotation(org.testng.annotations.Test)")
    public void trackedTestMethod() {
    }

    @Pointcut("@within(org.trackedtests.automation.selenium.java.testng.TrackedTest) && @annotation(org.testng.annotations.AfterTest)")
    public void afterTrackedTest() {
    }

    @Before("trackedTestMethod()")
    public void beforeTrackedTestMethod() {
        trackedTestHelper.attachTrackingMetadata();
    }

    @After("afterTrackedTest()")
    public void afterTrackedTestMethod() {
        trackedTestHelper.teardown();
    }
}

