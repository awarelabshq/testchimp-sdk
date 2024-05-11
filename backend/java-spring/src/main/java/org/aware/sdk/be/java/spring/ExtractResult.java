package org.aware.sdk.be.java.spring;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.aware.model.Payload;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExtractResult {

    Payload sanitizedPayload;
    Map<String, String> spanAttributes;
}
