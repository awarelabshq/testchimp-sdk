package org.trackedtests.sdk.be.java.spring;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestExtractResult {

    String sanitizedRequestBody;
    Map<String, String> sanitizedHeaderMap;
    Map<String, String> spanAttributes;
}
