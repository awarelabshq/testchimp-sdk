package org.testchimp.sdk.be.java.spring;


import lombok.*;
import org.testchimp.model.Payload;

import java.util.HashMap;
import java.util.Map;

@Data
@Getter
@Setter
public class ExtractResult {

    Payload sanitizedPayload;
    Map<String, String> spanAttributes;

    public ExtractResult(Payload payload, Map<String, String> spanAttributes) {
        this.spanAttributes = spanAttributes;
        this.sanitizedPayload = payload;
    }

    public ExtractResult() {
        this.spanAttributes = new HashMap<>();
        this.sanitizedPayload = Payload.getDefaultInstance();
    }
}
