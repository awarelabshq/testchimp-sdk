package org.aware.sdk.be.java.spring;


import lombok.*;
import org.aware.model.Payload;
import org.springframework.stereotype.Service;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ExtractResult {

    Payload sanitizedPayload;
    Map<String, String> spanAttributes;
}
