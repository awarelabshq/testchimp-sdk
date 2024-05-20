package org.aware.sdk.be.java.spring;

import org.aware.model.HttpFormDataBody;
import org.aware.model.HttpPayload;
import org.aware.model.Payload;

import java.util.Map;

public class PayloadUtils {

    public static Payload getHttpJsonPayload(String jsonBody, Map<String, String> headerMap, String httpMethod) {
        return Payload.newBuilder()
                .setHttpPayload(HttpPayload.newBuilder().setHttpMethod(httpMethod).setJsonBody(jsonBody)
                        .putAllHeaderMap(headerMap)).build();
    }

    public static Payload getHttpTextPayload(String body, Map<String, String> headerMap, String httpMethod) {
        return Payload.newBuilder()
                .setHttpPayload(HttpPayload.newBuilder().setHttpMethod(httpMethod).setTextBody(body)
                        .putAllHeaderMap(headerMap)).build();
    }

    public static Payload getHttpXmlPayload(String body, Map<String, String> headerMap, String httpMethod) {
        return Payload.newBuilder()
                .setHttpPayload(HttpPayload.newBuilder().setHttpMethod(httpMethod).setXmlBody(body)
                        .putAllHeaderMap(headerMap)).build();
    }

    public static Payload getHttpHtmlPayload(String body, Map<String, String> headerMap, String httpMethod) {
        return Payload.newBuilder()
                .setHttpPayload(HttpPayload.newBuilder().setHttpMethod(httpMethod).setHtmlBody(body)
                        .putAllHeaderMap(headerMap)).build();
    }

    public static Payload getHttpFormDataPayload(Map<String, String> keyValueMap, Map<String, String> headerMap, String httpMethod) {
        return Payload.newBuilder()
                .setHttpPayload(HttpPayload.newBuilder().setHttpMethod(httpMethod)
                        .setHttpFormDataBody(HttpFormDataBody.newBuilder().putAllKeyValueMap(keyValueMap))
                        .putAllHeaderMap(headerMap)).build();
    }
}
