package org.trackedtests.sdk.be.java.spring;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Component
public class DefaultRequestExtractor implements IExtractor {
    private static final Logger logger = Logger.getLogger(DefaultRequestExtractor.class.getName());
    public static final String EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD = "extractToSpanAttributes";
    public static final String IGNORED_FIELDS_YML_FIELD = "ignoredFields";
    public static final String IGNORED_HEADERS_YML_FIELD = "ignoredHeaders";
    public static final String REQUEST_YML_FIELD = "request";
    public static final String RESPONSE_YML_FIELD = "response";
    private static final String IGNORE_ALL_YML_FIELD = "ignoreAll";

    @Value("${aware.request_body_capture.config.file.path:classpath:aware_request_body_capture_config.yml}")
    private String configFilePath;

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    private Map<String, List<String>> requestExtractToSpanAttributesMap = new HashMap<>();
    private Map<String, List<String>> requestIgnoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> requestIgnoredHeadersMap = new HashMap<>();

    private Map<String, List<String>> responseExtractToSpanAttributesMap = new HashMap<>();
    // for uris in this set, all response bodies will be ignored.
    private Set<String> responseIgnoreAllUris = new HashSet<>();
    // for uris in this set, all request bodies will be ignored.
    private Set<String> requestIgnoreAllUris = new HashSet<>();
    private Map<String, List<String>> responseIgnoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> responseIgnoredHeadersMap = new HashMap<>();

    private List<String> uris = new ArrayList<>();

    @PostConstruct
    public void init() {
        logger.info("Initializing DefaultRequestExtractor...");
        try {
            ResourceLoader resourceLoader = new DefaultResourceLoader();
            Resource resource = resourceLoader.getResource(configFilePath);
            if (resource.exists()) {
                logger.info("Found tracked tests request capture config yml @ " + configFilePath);
                InputStream inputStream = resource.getInputStream();
                JsonNode rootNode = YAML_MAPPER.readTree(inputStream);
                Iterator<String> fieldNames = rootNode.fieldNames();
                while (fieldNames.hasNext()) {
                    String uriPattern = fieldNames.next();
                    uris.add(uriPattern);
                    JsonNode uriNode = rootNode.get(uriPattern);

                    // Request section
                    if (uriNode.has(REQUEST_YML_FIELD)) {
                        JsonNode requestNode = uriNode.get(REQUEST_YML_FIELD);
                        if (requestNode.has(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                            List<String> extractAttributes = new ArrayList<>();
                            for (JsonNode attributeNode : requestNode.get(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                                extractAttributes.add(attributeNode.asText());
                                logger.info("Rule: extract " + attributeNode.asText() + " for " + uriPattern + " (request)");
                            }
                            requestExtractToSpanAttributesMap.put(uriPattern, extractAttributes);
                        }
                        if (requestNode.has(IGNORE_ALL_YML_FIELD)) {
                            logger.info("Rule: ignore all of request for extract " + uriPattern);
                            requestIgnoreAllUris.add(uriPattern);
                        }
                        if (requestNode.has(IGNORED_FIELDS_YML_FIELD)) {
                            List<String> ignoredFields = new ArrayList<>();
                            for (JsonNode ignoredFieldNode : requestNode.get(IGNORED_FIELDS_YML_FIELD)) {
                                ignoredFields.add(ignoredFieldNode.asText());
                                logger.info("Rule: ignore field " + ignoredFieldNode.asText() + " for " + uriPattern + " (request)");
                            }
                            requestIgnoredFieldsMap.put(uriPattern, ignoredFields);
                        }
                        if (requestNode.has(IGNORED_HEADERS_YML_FIELD)) {
                            List<String> ignoredHeaders = new ArrayList<>();
                            for (JsonNode ignoredHeadersNode : requestNode.get(IGNORED_HEADERS_YML_FIELD)) {
                                ignoredHeaders.add(ignoredHeadersNode.asText());
                                logger.info("Rule: ignore header " + ignoredHeadersNode.asText() + " for " + uriPattern + " (request)");
                            }
                            requestIgnoredHeadersMap.put(uriPattern, ignoredHeaders);
                        }
                    }

                    // Response section
                    if (uriNode.has(RESPONSE_YML_FIELD)) {
                        JsonNode responseNode = uriNode.get(RESPONSE_YML_FIELD);
                        if (responseNode.has(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                            List<String> extractAttributes = new ArrayList<>();
                            for (JsonNode attributeNode : responseNode.get(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                                extractAttributes.add(attributeNode.asText());
                                logger.info("Rule: extract " + attributeNode.asText() + " for " + uriPattern + " (response)");
                            }
                            responseExtractToSpanAttributesMap.put(uriPattern, extractAttributes);
                        }
                        if (responseNode.has(IGNORE_ALL_YML_FIELD)) {
                            logger.info("Rule: ignore all of response for extract " + uriPattern);
                            responseIgnoreAllUris.add(uriPattern);
                        }
                        if (responseNode.has(IGNORED_FIELDS_YML_FIELD)) {
                            List<String> ignoredFields = new ArrayList<>();
                            for (JsonNode ignoredFieldNode : responseNode.get(IGNORED_FIELDS_YML_FIELD)) {
                                ignoredFields.add(ignoredFieldNode.asText());
                                logger.info("Rule: ignore field " + ignoredFieldNode.asText() + " for " + uriPattern + " (response)");
                            }
                            responseIgnoredFieldsMap.put(uriPattern, ignoredFields);
                        }
                        if (responseNode.has(IGNORED_HEADERS_YML_FIELD)) {
                            List<String> ignoredHeaders = new ArrayList<>();
                            for (JsonNode ignoredHeadersNode : responseNode.get(IGNORED_HEADERS_YML_FIELD)) {
                                ignoredHeaders.add(ignoredHeadersNode.asText());
                                logger.info("Rule: ignore header " + ignoredHeadersNode.asText() + " for " + uriPattern + " (request)");
                            }
                            responseIgnoredHeadersMap.put(uriPattern, ignoredHeaders);
                        }
                    }
                }
            } else {
                logger.warning("request capture config file not found at: " + configFilePath);
            }
        } catch (IOException e) {
            logger.log(Level.SEVERE, "Error reading request_body_capture_config.yml", e);
        }
    }

    @Override
    public ExtractResult extractFromRequest(String originalUri, String originalRequestBody, Map<String, String> originalHeaderMap) {
        logger.fine("Extracting request details for " + originalUri);
        // Check if the content type passed in the header is JSON
        ExtractResult result = new ExtractResult();
        boolean ignoreAll = false;
        boolean hasMatchedUri = false;
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                hasMatchedUri = true;
                if (requestIgnoreAllUris.contains(uri)) {
                    ignoreAll = true;
                }
            }
        }
        if (!hasMatchedUri) {
            ignoreAll = true;
        }

        String contentType = originalHeaderMap.getOrDefault("content-type", "");
        if (contentType != null && contentType.toLowerCase().contains("application/json")) {
            List<String> spanAttribsToExtract = new ArrayList<>();
            List<String> ignoredFields = new ArrayList<>();
            List<String> ignoredHeaders = new ArrayList<>();
            for (String uri : uris) {
                if (originalUri.matches(uri)) {
                    spanAttribsToExtract.addAll(requestExtractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredFields.addAll(requestIgnoredFieldsMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredHeaders.addAll(requestIgnoredHeadersMap.getOrDefault(uri, new ArrayList<>()));
                }
            }

            // Clean the headers.
            return getExtractResult(ignoreAll, originalRequestBody, originalHeaderMap, ignoredHeaders, spanAttribsToExtract, ignoredFields);
        }
        result.sanitizedBody = ignoreAll ? "" : originalRequestBody;
        result.sanitizedHeaderMap = ignoreAll ? new HashMap<>() : originalHeaderMap;
        result.spanAttributes = new HashMap<>();
        return result;
    }

    @Override
    public ExtractResult extractFromResponse(String originalUri, String orignalResponseBody, Map<String, String> originalHeaderMap) {
        logger.fine("Extracting response details for " + originalUri);
        // Check if the content type passed in the header is JSON
        ExtractResult result = new ExtractResult();
        boolean ignoreAll = false;
        boolean hasMatchedUri = false;
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                hasMatchedUri = true;
                if (requestIgnoreAllUris.contains(uri)) {
                    ignoreAll = true;
                }
            }
        }
        if (!hasMatchedUri) {
            ignoreAll = true;
        }
        String contentType = originalHeaderMap.getOrDefault("content-type", "");
        if (contentType != null && contentType.toLowerCase().contains("application/json")) {
            List<String> spanAttribsToExtract = new ArrayList<>();
            List<String> ignoredFields = new ArrayList<>();
            List<String> ignoredHeaders = new ArrayList<>();
            for (String uri : uris) {
                if (originalUri.matches(uri)) {
                    spanAttribsToExtract.addAll(responseExtractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredFields.addAll(responseIgnoredFieldsMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredHeaders.addAll(responseIgnoredHeadersMap.getOrDefault(uri, new ArrayList<>()));
                }
            }

            // Clean the headers.
            return getExtractResult(ignoreAll, orignalResponseBody, originalHeaderMap, ignoredHeaders, spanAttribsToExtract, ignoredFields);
        }
        result.sanitizedBody = ignoreAll ? "" : orignalResponseBody;
        result.sanitizedHeaderMap = ignoreAll ? new HashMap<>() : originalHeaderMap;
        result.spanAttributes = new HashMap<>();
        return result;
    }

    private ExtractResult getExtractResult(Boolean ignoreAll, String originalBody, Map<String, String> originalHeaderMap, List<String> ignoredHeaders, List<String> spanAttribsToExtract, List<String> ignoredFields) {
        for (String ignoredHeader : ignoredHeaders) {
            originalHeaderMap.remove(ignoredHeader);
        }
        if (!spanAttribsToExtract.isEmpty() || !ignoredFields.isEmpty()) {
            // Parse the JSON string
            DocumentContext jsonContext = JsonPath.parse(originalBody, Configuration.defaultConfiguration()
                    .addOptions(Option.SUPPRESS_EXCEPTIONS));

            // Scrub the ignored fields
            for (String ignoredField : ignoredFields) {
                try {
                    jsonContext.set(ignoredField, "");
                } catch (Exception e) {
                    // This happens when the field is not present. No need to do anything since nothing to be scrubbed.
                }
            }

            // Extract span attributes
            Map<String, String> spanAttributes = new HashMap<>();
            for (String attribute : spanAttribsToExtract) {
                Object value = jsonContext.read(attribute);
                String fieldName = extractFieldName(attribute);

                List<Object> valueList = new ArrayList<>();
                if (value instanceof List) {
                    // If the value is a list, process each element
                    valueList = (List<Object>) value;
                } else {
                    valueList.add(value);
                }
                if (!valueList.isEmpty()) {
                    String strValue = String.join(",", valueList.stream().map(v -> String.valueOf(v))
                            .collect(Collectors.toList()));
                    logger.fine("Extracting " + attribute + " as " + fieldName + " with value: " + strValue);
                    spanAttributes.put(fieldName, strValue);
                }
            }

            // Return extraction result
            ExtractResult result = new ExtractResult();
            result.sanitizedHeaderMap = ignoreAll ? new HashMap<>() : originalHeaderMap;
            result.sanitizedBody = ignoreAll ? "" : jsonContext.jsonString();
            result.spanAttributes = spanAttributes.entrySet().stream()
                    .map(entry -> new AbstractMap.SimpleEntry<>(entry.getKey(), entry.getValue()))
                    .collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue()));
            return result;
        }
        ExtractResult result = new ExtractResult();
        result.sanitizedBody = ignoreAll ? "" : originalBody;
        result.sanitizedHeaderMap = ignoreAll ? new HashMap<>() : originalHeaderMap;
        result.spanAttributes = new HashMap<>();
        return result;
    }


    private String extractFieldName(String attribute) {
        // Extract the field name from the attribute (JSON selector)
        int lastIndex = attribute.lastIndexOf('.');
        return lastIndex != -1 ? attribute.substring(lastIndex + 1) : attribute;
    }
}
