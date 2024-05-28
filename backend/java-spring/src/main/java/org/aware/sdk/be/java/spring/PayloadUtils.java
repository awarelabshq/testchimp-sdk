package org.aware.sdk.be.java.spring;

import org.aware.model.HttpFormDataBody;
import org.aware.model.HttpPayload;
import org.aware.model.Payload;

import java.util.Map;

public class PayloadUtils {

    public static Payload getHttpJsonPayload(String jsonBody, HttpPayload.Builder existingPayload) {
        return Payload.newBuilder()
                .setHttpPayload(existingPayload.setJsonBody(jsonBody)).build();
    }

    public static Payload getHttpTextPayload(String body, HttpPayload.Builder existingPayload) {
        return Payload.newBuilder()
                .setHttpPayload(existingPayload.setTextBody(body)).build();
    }

    public static Payload getHttpXmlPayload(String body, HttpPayload.Builder existingPayload) {
        return Payload.newBuilder().setHttpPayload(existingPayload.setXmlBody(body)).build();
    }

    public static Payload getHttpHtmlPayload(String body, HttpPayload.Builder existingPayload) {
        return Payload.newBuilder().setHttpPayload(existingPayload.setHtmlBody(body)).build();
    }

    public static Payload getHttpFormDataPayload(Map<String, String> keyValueMap, HttpPayload.Builder existingPayload) {
        return Payload.newBuilder().setHttpPayload(existingPayload.setHttpFormDataBody(HttpFormDataBody.newBuilder()
                .putAllKeyValueMap(keyValueMap))).build();
    }
}
