package org.aware.sdk.be.java.spring;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import org.aware.model.Payload;
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
    private static final String GLOBAL_CONFIG_YML_FIELD = "global_config";
    private static final String URL_CONFIGS_YML_FIELD = "url_configs";

    private static final String IGNORE_URLS_YML_FIELD = "ignored_urls";
    private static final String IGNORE_HEADERS_YML_FIELD = "ignored_headers";

    public static final String REQUEST_YML_FIELD = "request";
    public static final String RESPONSE_YML_FIELD = "response";

    public static final String EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD = "extract_to_span_attributes";
    public static final String IGNORED_FIELDS_YML_FIELD = "ignored_fields";
    public static final String IGNORED_HEADERS_YML_FIELD = "ignored_headers";
    private static final String IGNORE_PAYLOAD_YML_FIELD = "ignore_payload";

    @Value("${aware.request_body_capture.config.file.path:classpath:aware_request_body_capture_config.yml}")
    private String configFilePath;

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    // for uris in this set, all request bodies will be ignored.
    private Set<String> requestIgnoreUris = new HashSet<>();
    // for uris in this set, all response bodies will be ignored.
    private Set<String> responseIgnoreUris = new HashSet<>();

    private Map<String, List<String>> requestExtractToSpanAttributesMap = new HashMap<>();
    private Map<String, List<String>> requestIgnoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> requestIgnoredHeadersMap = new HashMap<>();


    private Map<String, List<String>> responseExtractToSpanAttributesMap = new HashMap<>();
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

                // Parse global config
                parseGlobalConfig(rootNode.get(GLOBAL_CONFIG_YML_FIELD));

                // Parse URL configs
                if (rootNode.has(URL_CONFIGS_YML_FIELD)) {
                    JsonNode urlConfigsNode = rootNode.get(URL_CONFIGS_YML_FIELD);
                    Iterator<String> fieldNames = urlConfigsNode.fieldNames();
                    while (fieldNames.hasNext()) {
                        String uriPattern = fieldNames.next();
                        uris.add(uriPattern);
                        JsonNode uriNode = urlConfigsNode.get(uriPattern);

                        // Parse request section
                        parseSection(uriPattern, uriNode.get(REQUEST_YML_FIELD), requestExtractToSpanAttributesMap,
                                requestIgnoredFieldsMap, requestIgnoredHeadersMap, requestIgnoreUris);

                        // Parse response section
                        parseSection(uriPattern, uriNode.get(RESPONSE_YML_FIELD), responseExtractToSpanAttributesMap,
                                responseIgnoredFieldsMap, responseIgnoredHeadersMap, responseIgnoreUris);
                    }
                }
            } else {
                logger.warning("request capture config file not found at: " + configFilePath);
            }
        } catch (IOException e) {
            logger.log(Level.SEVERE, "Error reading request_body_capture_config.yml", e);
        }
    }

    private void parseGlobalConfig(JsonNode globalConfigNode) {
        if (globalConfigNode != null) {
            if (globalConfigNode.has(IGNORE_URLS_YML_FIELD)) {
                for (JsonNode ignoreUrlNode : globalConfigNode.get(IGNORE_URLS_YML_FIELD)) {
                    String ignoreUrl = ignoreUrlNode.asText();
                    requestIgnoreUris.add(ignoreUrl);
                    responseIgnoreUris.add(ignoreUrl);
                    logger.info("Rule: ignore all payload capture for URLs matching: " + ignoreUrl);
                }
            }
            if (globalConfigNode.has(IGNORE_HEADERS_YML_FIELD)) {
                for (JsonNode ignoreHeaderNode : globalConfigNode.get(IGNORE_HEADERS_YML_FIELD)) {
                    String ignoreHeader = ignoreHeaderNode.asText();
                    requestIgnoredHeadersMap.put(".*", Arrays.asList(ignoreHeader));
                    responseIgnoredHeadersMap.put(".*", Arrays.asList(ignoreHeader));
                    logger.info("Rule: For all requests / responses, ignore header " + ignoreHeader);
                }
            }
        }
    }

    private void parseSection(String uriPattern, JsonNode sectionNode,
                              Map<String, List<String>> extractToSpanAttributesMap,
                              Map<String, List<String>> ignoredFieldsMap,
                              Map<String, List<String>> ignoredHeadersMap,
                              Set<String> ignoreUris) {
        if (sectionNode != null) {
            if (sectionNode.has(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                List<String> extractAttributes = new ArrayList<>();
                for (JsonNode attributeNode : sectionNode.get(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                    String attribute = attributeNode.asText();
                    extractAttributes.add(attribute);
                    logger.info("Rule: extract " + attribute + " for " + uriPattern);
                }
                extractToSpanAttributesMap.put(uriPattern, extractAttributes);
            }
            if (sectionNode.has(IGNORE_PAYLOAD_YML_FIELD)) {
                logger.info("Rule: ignore payload for " + uriPattern);
                ignoreUris.add(uriPattern);
            }
            if (sectionNode.has(IGNORED_FIELDS_YML_FIELD)) {
                List<String> ignoredFields = new ArrayList<>();
                for (JsonNode ignoredFieldNode : sectionNode.get(IGNORED_FIELDS_YML_FIELD)) {
                    String ignoredField = ignoredFieldNode.asText();
                    ignoredFields.add(ignoredField);
                    logger.info("Rule: ignore field " + ignoredField + " for " + uriPattern);
                }
                ignoredFieldsMap.put(uriPattern, ignoredFields);
            }
            if (sectionNode.has(IGNORED_HEADERS_YML_FIELD)) {
                List<String> ignoredHeaders = new ArrayList<>();
                for (JsonNode ignoredHeadersNode : sectionNode.get(IGNORED_HEADERS_YML_FIELD)) {
                    String ignoredHeader = ignoredHeadersNode.asText();
                    ignoredHeaders.add(ignoredHeader);
                    logger.info("Rule: ignore header " + ignoredHeader + " for " + uriPattern);
                }
                ignoredHeadersMap.put(uriPattern, ignoredHeaders);
            }
        } else {
            ignoreUris.add(uriPattern);
        }
    }

    @Override
    public ExtractResult extractFromRequest(String originalUri, String originalRequestBody, Map<String, String> originalHeaderMap) {
        logger.fine("Extracting request details for " + originalUri);
        // Check if the content type passed in the header is JSON
        ExtractResult result = new ExtractResult();
        boolean ignorePayload = false;
        boolean hasMatchedUri = false;
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                hasMatchedUri = true;
            }
        }
        for (String uri : requestIgnoreUris) {
            if (originalUri.matches(uri)) {
                ignorePayload = true;
                break;
            }
        }
        if (!hasMatchedUri) {
            ignorePayload = true;
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
            return getExtractResult(ignorePayload, originalRequestBody, originalHeaderMap, ignoredHeaders, spanAttribsToExtract, ignoredFields);
        }
        result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpJsonPayload(originalRequestBody, originalHeaderMap);
        result.spanAttributes = new HashMap<>();
        return result;
    }

    @Override
    public ExtractResult extractFromResponse(String originalUri, String originalResponseBody, Map<String, String> originalHeaderMap) {
        logger.fine("Extracting response details for " + originalUri);
        // Check if the content type passed in the header is JSON
        ExtractResult result = new ExtractResult();
        boolean ignorePayload = false;
        boolean hasMatchedUri = false;
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                hasMatchedUri = true;
            }
        }
        for (String uri : requestIgnoreUris) {
            if (originalUri.matches(uri)) {
                ignorePayload = true;
                break;
            }
        }
        if (!hasMatchedUri) {
            ignorePayload = true;
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
            return getExtractResult(ignorePayload, originalResponseBody, originalHeaderMap, ignoredHeaders, spanAttribsToExtract, ignoredFields);
        }
        result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpJsonPayload(originalResponseBody, originalHeaderMap);
        result.spanAttributes = new HashMap<>();
        return result;
    }

    private ExtractResult getExtractResult(Boolean ignorePayload, String originalBody, Map<String, String> originalHeaderMap, List<String> ignoredHeaders, List<String> spanAttribsToExtract, List<String> ignoredFields) {
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
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpJsonPayload(jsonContext.jsonString(), originalHeaderMap);
            result.spanAttributes = spanAttributes.entrySet().stream()
                    .map(entry -> new AbstractMap.SimpleEntry<>(entry.getKey(), entry.getValue()))
                    .collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue()));
            return result;
        }
        ExtractResult result = new ExtractResult();
        result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpJsonPayload(originalBody, originalHeaderMap);
        result.spanAttributes = new HashMap<>();
        return result;
    }


    private String extractFieldName(String attribute) {
        // Extract the field name from the attribute (JSON selector)
        int lastIndex = attribute.lastIndexOf('.');
        return lastIndex != -1 ? attribute.substring(lastIndex + 1) : attribute;
    }
}
