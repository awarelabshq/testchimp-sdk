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
public class DefaultRequestExtractor implements IRequestExtractor {
    private static final Logger logger = Logger.getLogger(DefaultRequestExtractor.class.getName());
    public static final String EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD = "extractToSpanAttributes";
    public static final String IGNORED_FIELDS_YML_FIELD = "ignoredFields";
    public static final String IGNORED_HEADERS_YML_FIELD = "ignoredHeaders";
    private static final String SESSION_ID_SPAN_ATTRIBUTE = "aware.derived.session_id";

    @Value("${aware.request_body_capture.config.file.path:classpath:aware_request_body_capture_config.yml}")
    private String configFilePath;

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    private Map<String, List<String>> extractToSpanAttributesMap = new HashMap<>();
    private Map<String, List<String>> ignoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> ignoredHeadersMap = new HashMap<>();
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
                    if (uriNode.has(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                        List<String> extractAttributes = new ArrayList<>();
                        for (JsonNode attributeNode : uriNode.get(EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                            extractAttributes.add(attributeNode.asText());
                            logger.info("Rule: extract " + attributeNode.asText() + " for " + uriPattern);
                        }
                        extractToSpanAttributesMap.put(uriPattern, extractAttributes);
                    }
                    if (uriNode.has(IGNORED_FIELDS_YML_FIELD)) {
                        List<String> ignoredFields = new ArrayList<>();
                        for (JsonNode ignoredFieldNode : uriNode.get(IGNORED_FIELDS_YML_FIELD)) {
                            ignoredFields.add(ignoredFieldNode.asText());
                            logger.info("Rule: ignore field " + ignoredFieldNode.asText() + " for " + uriPattern);
                        }
                        ignoredFieldsMap.put(uriPattern, ignoredFields);
                    }
                    if (uriNode.has(IGNORED_HEADERS_YML_FIELD)) {
                        List<String> ignoredHeaders = new ArrayList<>();
                        for (JsonNode ignoredFieldNode : uriNode.get(IGNORED_HEADERS_YML_FIELD)) {
                            ignoredHeaders.add(ignoredFieldNode.asText());
                            logger.info("Rule: ignore header: " + ignoredFieldNode.asText() + " for " + uriPattern);
                        }
                        ignoredHeadersMap.put(uriPattern, ignoredHeaders);
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
    public RequestExtractResult extract(String originalUri, String originalRequestBody, Map<String, String> originalHeaderMap) {
        logger.fine("Extracting request details for " + originalUri);
        // Check if the content type passed in the header is JSON
        RequestExtractResult result = new RequestExtractResult();
        String contentType = originalHeaderMap.getOrDefault("content-type", "");
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
                DocumentContext jsonContext = JsonPath.parse(originalRequestBody, Configuration.defaultConfiguration()
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

                // Extract session id from cookie header if present.
                String sessionId = extractSessionId(originalHeaderMap);
                if (sessionId != null && !sessionId.isEmpty()) {
                    spanAttributes.put(SESSION_ID_SPAN_ATTRIBUTE, sessionId);
                }

                // Return extraction result
                logger.fine("Returning sanitized result for " + originalUri);
                result.sanitizedHeaderMap = originalHeaderMap;
                result.sanitizedRequestBody = jsonContext.jsonString();
                result.spanAttributes = spanAttributes.entrySet().stream()
                        .map(entry -> new AbstractMap.SimpleEntry<>(entry.getKey(), entry.getValue()))
                        .collect(Collectors.toMap(entry -> entry.getKey(), entry -> entry.getValue()));
                return result;
            }
        }
        result.sanitizedRequestBody = originalRequestBody;
        result.sanitizedHeaderMap = originalHeaderMap;
        result.spanAttributes = new HashMap<>();
        return result;
    }

    private String extractSessionId(Map<String, String> headers) {
        String cookies = headers.getOrDefault("cookie", "");

        // Split the cookies string into individual cookies
        String[] cookieParts = cookies.split(";");

        // Iterate over each cookie part to find the session ID
        for (String cookiePart : cookieParts) {
            // Trim the cookie part to remove leading and trailing whitespace
            String trimmedCookiePart = cookiePart.trim();

            // Check if the cookie part contains an '=' sign indicating a key-value pair
            if (trimmedCookiePart.contains("=")) {
                // Split the cookie part into key and value
                String[] keyValue = trimmedCookiePart.split("=");

                // Check if the key is one of the commonly used session ID cookie names
                String key = keyValue[0].trim();
                if (key.equalsIgnoreCase("sessionid") || key.equalsIgnoreCase("JSESSIONID") || key.equalsIgnoreCase("PHPSESSID")) {
                    // If found, return the session ID value
                    return keyValue[1].trim();
                }
            }
        }

        // If no session ID cookie is found, return null
        return null;
    }


    private String extractFieldName(String attribute) {
        // Extract the field name from the attribute (JSON selector)
        int lastIndex = attribute.lastIndexOf('.');
        return lastIndex != -1 ? attribute.substring(lastIndex + 1) : attribute;
    }
}
