package org.aware.sdk.be.java.spring;

import org.aware.model.HttpPayload;
import org.aware.model.Payload;

import java.util.Map;

public class PayloadUtils {

    public static Payload getHttpJsonPayload(String jsonBody, Map<String, String> headerMap) {
        return Payload.newBuilder()
                .setHttpPayload(HttpPayload.newBuilder().setJsonBody(jsonBody).putAllHeaderMap(headerMap)).build();
    }
}
