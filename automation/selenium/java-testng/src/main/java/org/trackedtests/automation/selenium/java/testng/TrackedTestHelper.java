package org.trackedtests.automation.selenium.java.testng;

import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Component;

import net.lightbody.bmp.BrowserMobProxy;
import net.lightbody.bmp.BrowserMobProxyServer;
import net.lightbody.bmp.client.ClientUtil;
import org.openqa.selenium.Proxy;
import org.openqa.selenium.remote.AbstractDriverOptions;
import org.openqa.selenium.remote.CapabilityType;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.UUID;

@Component
@Scope("prototype")
public class TrackedTestHelper {
    BrowserMobProxy proxy;

    public void attachTrackingMetadata() {
        StackTraceElement[] stackTraceElements = Thread.currentThread().getStackTrace();
        if (stackTraceElements.length >= 3) {
            String className = stackTraceElements[2].getClassName();
            String methodName = stackTraceElements[2].getMethodName();
            proxy.addHeader("trackedtest.name", className + "#" + methodName);
            proxy.addHeader("trackedtest.suite", className);
            proxy.addHeader("trackedtest.invocation_id", UUID.randomUUID().toString());
            proxy.addHeader("test.type", "selenium");
        }
    }

    public AbstractDriverOptions enableTracking(AbstractDriverOptions options) throws UnknownHostException {
        Proxy seleniumProxy = ClientUtil.createSeleniumProxy(proxy);
        seleniumProxy.setHttpProxy(InetAddress.getLocalHost().getHostAddress() + ":" + proxy.getPort());
        seleniumProxy.setSslProxy(InetAddress.getLocalHost().getHostAddress() + ":" + proxy.getPort());
        options.setCapability(CapabilityType.PROXY, seleniumProxy);
        return options;
    }

    public void init() {
        proxy = new BrowserMobProxyServer();
        proxy.setTrustAllServers(true);
        proxy.start();
    }

    public void init(BrowserMobProxy existingProxy) {
        proxy = existingProxy;
    }

    public void teardown() {
        proxy.stop();
    }
}
