package org.trackedtests.sdk.be.java.spring;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

public class DefaultRequestExtractor implements IRequestExtractor {
    private static final Logger logger = Logger.getLogger(DefaultRequestExtractor.class.getName());
    public static final String EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD = "extractToSpanAttributes";
    public static final String IGNORED_FIELDS_YML_FIELD = "ignoredFields";
    public static final String IGNORED_HEADERS_YML_FIELD = "ignoredHeaders";

    @Value("${aware.request_body_capture.config.file.path:classpath:aware_request_body_capture_config.yml}")
    private String configFilePath;

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    private Map<String, List<String>> extractToSpanAttributesMap = new HashMap<>();
    private Map<String, List<String>> ignoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> ignoredHeadersMap = new HashMap<>();
    private List<String> uris = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            ResourceLoader resourceLoader = new DefaultResourceLoader();
            Resource resource = resourceLoader.getResource(configFilePath);
            if (resource.exists()) {
                InputStream inputStream = resource.getInputStream();
                JsonNode rootNode = YAML_MAPPER.readTree(inputStream);
                Iterator<String> fieldNames = rootNode.fieldNames();
                while (fieldNames.hasNext()) {
                    String uriPattern = fieldNames.next();
                    uris.add(uriPattern);
                    JsonNode uriNode = rootNode.get(uriPattern);
                    if (uriNode.has(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                        List<String> extractAttributes = new ArrayList<>();
                        for (JsonNode attributeNode : uriNode.get(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                            extractAttributes.add(attributeNode.asText());
                        }
                        extractToSpanAttributesMap.put(uriPattern, extractAttributes);
                    }
                    if (uriNode.has(IGNORED_FIELDS_YML_FIELD)) {
                        List<String> ignoredFields = new ArrayList<>();
                        for (JsonNode ignoredFieldNode : uriNode.get(IGNORED_FIELDS_YML_FIELD)) {
                            ignoredFields.add(ignoredFieldNode.asText());
                        }
                        ignoredFieldsMap.put(uriPattern, ignoredFields);
                    }
                    if (uriNode.has(IGNORED_HEADERS_YML_FIELD)) {
                        List<String> ignoredHeaders = new ArrayList<>();
                        for (JsonNode ignoredFieldNode : uriNode.get(IGNORED_HEADERS_YML_FIELD)) {
                            ignoredHeaders.add(ignoredFieldNode.asText());
                        }
                        ignoredHeadersMap.put(uriPattern, ignoredHeaders);
                    }
                }
            }
        } catch (IOException e) {
            logger.log(Level.SEVERE, "Error reading request_body_capture_config.yml", e);
        }
    }

    @Override
    public RequestExtractResult extract(String originalUri, String originalRequestBody, Map<String, String> originalHeaderMap) {
        // Check if the content type passed in the header is JSON
        RequestExtractResult result = new RequestExtractResult();
        String contentType = originalHeaderMap.getOrDefault("Content-Type", originalHeaderMap.get("content-type"));
        if (contentType != null && contentType.toLowerCase().contains("application/json")) {
            List<String> spanAttribsToExtract = new ArrayList<>();
            List<String> ignoredFields = new ArrayList<>();
            List<String> ignoredHeaders = new ArrayList<>();
            for (String uri : uris) {
                if (originalUri.matches(uri)) {
                    spanAttribsToExtract.addAll(extractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredFields.addAll(ignoredFieldsMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredHeaders.addAll(ignoredHeadersMap.getOrDefault(uri, new ArrayList<>()));
                }
            }
            // Clean the headers.
            for (String ignoredHeader : ignoredHeaders) {
                originalHeaderMap.remove(ignoredHeader);
            }
            if (!spanAttribsToExtract.isEmpty() || !ignoredFields.isEmpty()) {
                // Parse the JSON string
                DocumentContext jsonContext = JsonPath.parse(originalRequestBody);

                // Scrub the ignored fields
                for (String ignoredField : ignoredFields) {
                    jsonContext.set(ignoredField, "");
                }

                // Extract span attributes
                Map<String, List<String>> spanAttributes = new HashMap<>();
                for (String attribute : spanAttribsToExtract) {
                    Object value = jsonContext.read(attribute);
                    List<Object> valueList = new ArrayList<>();
                    if (value instanceof List) {
                        // If the value is a list, process each element
                        valueList = (List<Object>) value;
                    } else {
                        valueList.add(value);
                    }
                    if (!valueList.isEmpty()) {
                        spanAttributes.put(attribute, valueList.stream().map(v -> String.valueOf(v))
                                .collect(Collectors.toList()));
                    }
                }

                // Return extraction result
                result.sanitizedHeaderMap = originalHeaderMap;
                result.sanitizedRequestBody = jsonContext.jsonString();
                result.spanAttributes = spanAttributes.entrySet().stream()
                        .map(entry -> new AbstractMap.SimpleEntry<>(entry.getKey(), String.join(",", entry.getValue())))
                        .collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue()));
                return result;
            }
        }
        result.sanitizedRequestBody = originalRequestBody;
        result.sanitizedHeaderMap = originalHeaderMap;
        result.spanAttributes = new HashMap<>();
        return result;
    }
}
