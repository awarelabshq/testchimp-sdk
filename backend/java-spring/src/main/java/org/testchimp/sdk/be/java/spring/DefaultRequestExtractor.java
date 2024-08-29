package org.testchimp.sdk.be.java.spring;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.Option;
import lombok.SneakyThrows;
import org.testchimp.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.servlet.ServletException;
import javax.servlet.http.Part;
import java.io.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Component
public class DefaultRequestExtractor implements IExtractor {
    private static final Logger logger = Logger.getLogger(DefaultRequestExtractor.class.getName());
    private static final String GLOBAL_CONFIG_YML_FIELD = "global_config";
    private static final String URL_CONFIGS_YML_FIELD = "url_configs";
    private static final String ENABLE_OPTIONS_CALL_TRACKING_FIELD = "enable_options_call_tracking";

    private static final String IGNORE_URLS_YML_FIELD = "ignored_urls";
    private static final String IGNORE_HEADERS_YML_FIELD = "ignored_headers";
    private static final String USER_ID_HEADER_YML_FIELD = "user_id_header";
    private static final String SESSION_RECORD_TRACKING_ID_YML_FIELD = "session_record_tracking_id_header";
    private static final String USER_ID_BODY_FIELD_YML_FIELD = "user_id_field";

    public static final String REQUEST_YML_FIELD = "request";
    public static final String RESPONSE_YML_FIELD = "response";

    public static final String EXTRACT_TO_SPAN_ATTRIBUTES_YML_FIELD = "extract_to_span_attributes";
    public static final String EXTRACT_HEADERS_TO_SPAN_ATTRIBUTES_YML_FIELD = "extract_headers_to_span_attributes";
    public static final String IGNORED_FIELDS_YML_FIELD = "ignored_fields";
    public static final String IGNORED_HEADERS_YML_FIELD = "ignored_headers";
    private static final String IGNORE_PAYLOAD_YML_FIELD = "ignore_payload";

    @Value("${testchimp.sdk.config.file.path:classpath:testchimp_sdk_config.yml}")
    private String configFilePath;

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    // for uris in this set, all request bodies will be ignored.
    private Set<String> requestIgnoreUris = new HashSet<>();
    // for uris in this set, all response bodies will be ignored.
    private Set<String> responseIgnoreUris = new HashSet<>();

    private String userIdHeader;
    private String sessionRecordTrackingIdHeader;
    private Map<String, List<String>> requestExtractToSpanAttributesMap = new HashMap<>();
    private Map<String, String> requestExtractToUserIdMap = new HashMap<>();
    private Map<String, List<String>> requestHeaderExtractToSpanAttributesMap = new HashMap<>();
    private Map<String, List<String>> requestIgnoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> requestIgnoredHeadersMap = new HashMap<>();


    private Map<String, List<String>> responseExtractToSpanAttributesMap = new HashMap<>();
    private Map<String, String> responseExtractToUserIdMap = new HashMap<>();
    private Map<String, List<String>> responseHeaderExtractToSpanAttributesMap = new HashMap<>();
    private Map<String, List<String>> responseIgnoredFieldsMap = new HashMap<>();
    private Map<String, List<String>> responseIgnoredHeadersMap = new HashMap<>();

    private List<String> uris = new ArrayList<>();
    private boolean enableOptionsCallTracking;

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
                        logger.info("uri pattern " + uriPattern + " will be intercepted");
                        uris.add(uriPattern);
                        JsonNode uriNode = urlConfigsNode.get(uriPattern);

                        // Parse request section
                        parseSection(uriPattern, uriNode.get(REQUEST_YML_FIELD), requestExtractToSpanAttributesMap, requestHeaderExtractToSpanAttributesMap,
                                requestIgnoredFieldsMap, requestIgnoredHeadersMap, requestExtractToUserIdMap, requestIgnoreUris);

                        // Parse response section
                        parseSection(uriPattern, uriNode.get(RESPONSE_YML_FIELD), responseExtractToSpanAttributesMap, responseHeaderExtractToSpanAttributesMap,
                                responseIgnoredFieldsMap, responseIgnoredHeadersMap, responseExtractToUserIdMap, responseIgnoreUris);
                    }
                }
            } else {
                logger.warning("request capture config file not found at: " + configFilePath);
            }
        } catch (IOException e) {
            logger.log(Level.SEVERE, "Error reading request_body_capture_config.yml", e);
        }
        logger.info("Request ignore uris: " + String.join(",", requestIgnoreUris));
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
            if (globalConfigNode.has(USER_ID_HEADER_YML_FIELD)) {
                userIdHeader = globalConfigNode.get(USER_ID_HEADER_YML_FIELD).asText().toLowerCase();
            }
            if (globalConfigNode.has(SESSION_RECORD_TRACKING_ID_YML_FIELD)) {
                sessionRecordTrackingIdHeader = globalConfigNode.get(SESSION_RECORD_TRACKING_ID_YML_FIELD).asText()
                        .toLowerCase();
            }
            // Read the enableOptionsCallTracking field
            enableOptionsCallTracking = false;
            if (globalConfigNode.has(ENABLE_OPTIONS_CALL_TRACKING_FIELD)) {
                enableOptionsCallTracking = globalConfigNode.get(ENABLE_OPTIONS_CALL_TRACKING_FIELD).asBoolean();
                logger.info("Configuration: enableOptionsCallTracking set to " + enableOptionsCallTracking);
            }
        }
    }

    private void parseSection(String uriPattern, JsonNode sectionNode,
                              Map<String, List<String>> extractToSpanAttributesMap, Map<String, List<String>> extractHeadersToSpanAttributesMap,
                              Map<String, List<String>> ignoredFieldsMap,
                              Map<String, List<String>> ignoredHeadersMap, Map<String, String> userIdFieldMap,
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
            if (sectionNode.has(EXTRACT_HEADERS_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                List<String> extractHeaderAttributes = new ArrayList<>();
                for (JsonNode attributeNode : sectionNode.get(EXTRACT_HEADERS_TO_SPAN_ATTRIBUTES_YML_FIELD)) {
                    String attribute = attributeNode.asText();
                    extractHeaderAttributes.add(attribute);
                    logger.info("Rule: extract header " + attribute + " for " + uriPattern);
                }
                extractHeadersToSpanAttributesMap.put(uriPattern, extractHeaderAttributes);
            }
            if (sectionNode.has(USER_ID_BODY_FIELD_YML_FIELD)) {
                String userIdField = sectionNode.get(USER_ID_BODY_FIELD_YML_FIELD).asText();
                logger.info("Rule: user id field: " + userIdField + " captured for uris: " + uriPattern);
                userIdFieldMap.put(uriPattern, userIdField);
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
    public ExtractResult extractFromRequest(CachedRequestHttpServletRequest request) {
        String originalUri = request.getRequestURI();

        if (!enableOptionsCallTracking && request.getMethod().equals("OPTIONS")) {
            return new ExtractResult();
        }

        List<String> headerAttribsToExtract = new ArrayList<>();
        List<String> ignoredHeaders = new ArrayList<>();
        boolean ignorePayload = false;
        boolean hasMatchedUri = false;
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                hasMatchedUri = true;
                headerAttribsToExtract.addAll(requestHeaderExtractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                ignoredHeaders.addAll(requestIgnoredHeadersMap.getOrDefault(uri, new ArrayList<>()));
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

        logger.fine("Extracting request details for " + originalUri + " ignorePayload: " + ignorePayload + " hasMatchedUri  " + hasMatchedUri);

        // Parse the header section and build a partial ExtractResult.
        ExtractResult result = getPartialExtractionResultFromHeader(ignorePayload, request.getRequestHeaders(), headerAttribsToExtract, ignoredHeaders, /*response code not applicalbe for request payloads*/null);
        result = populateQueryParamsAndMethod(result, request);
        HttpPayload.Builder existingHttpPayload = result.sanitizedPayload.getHttpPayload().toBuilder();


        String originalContentType = request.getRequestHeaders().getOrDefault("content-type", "");
        if (originalContentType == null) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpTextPayload(request.getBodyString(), existingHttpPayload);
            return result;
        }

        // Parse the body portion and build on the partial extract result to construct the final extract result.
        List<String> spanAttribsToExtract = new ArrayList<>();
        List<String> ignoredFields = new ArrayList<>();
        List<String> userIdBodyFields = new ArrayList<>();
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                spanAttribsToExtract.addAll(requestExtractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                ignoredFields.addAll(requestIgnoredFieldsMap.getOrDefault(uri, new ArrayList<>()));
                userIdBodyFields.add(requestExtractToUserIdMap.getOrDefault(uri, ""));
            }
        }

        String contentType = originalContentType.toLowerCase();
        if (contentType.contains("application/json")) {
            return getJsonBodyExtractResult(ignorePayload, request.getBodyString(), result.spanAttributes, spanAttribsToExtract, ignoredFields, userIdBodyFields.stream()
                    .filter(field -> !field.isEmpty()).collect(Collectors.toList()), existingHttpPayload);
        } else if (contentType.contains("text/plain")) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpTextPayload(request.getBodyString(), existingHttpPayload);
            return result;
        } else if (contentType.contains("text/html")) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpHtmlPayload(request.getBodyString(), existingHttpPayload);
            return result;
        } else if (contentType.contains("text/xml") || contentType
                .contains("application/xml")) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpXmlPayload(request.getBodyString(), existingHttpPayload);
            return result;
        } else if (contentType.contains("application/x-www-form-urlencoded")) {
            return handleUrlEncodedFormData(request, ignorePayload, result.spanAttributes, spanAttribsToExtract, ignoredFields, userIdBodyFields, existingHttpPayload);
        } else if (contentType.contains("multipart/form-data")) {
            return handleMultipartFormData(request, ignorePayload, result.spanAttributes, spanAttribsToExtract, ignoredFields, userIdBodyFields, existingHttpPayload);
        }
        result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpTextPayload(request.getBodyString(), existingHttpPayload);
        return result;
    }

    private ExtractResult populateQueryParamsAndMethod(ExtractResult result, CachedRequestHttpServletRequest request) {
        HttpPayload.Builder httpPayloadBuilder = result.sanitizedPayload.getHttpPayload().toBuilder();
        httpPayloadBuilder.setHttpMethod(request.getMethod());
        populateQueryParams(httpPayloadBuilder, request);
        result.sanitizedPayload = result.sanitizedPayload.toBuilder().setHttpPayload(httpPayloadBuilder.build())
                .build();
        return result;
    }

    @SneakyThrows
    @Override
    public ExtractResult extractFromResponse(String originalUri, CachedResponseHttpServletResponse response) {
        // Check if the content type passed in the header is JSON
        List<String> headerAttribsToExtract = new ArrayList<>();
        List<String> ignoredHeaders = new ArrayList<>();
        boolean ignorePayload = false;
        boolean hasMatchedUri = false;
        for (String uri : uris) {
            if (originalUri.matches(uri)) {
                hasMatchedUri = true;
                headerAttribsToExtract.addAll(responseHeaderExtractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                ignoredHeaders.addAll(responseIgnoredHeadersMap.getOrDefault(uri, new ArrayList<>()));
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

        ExtractResult result = getPartialExtractionResultFromHeader(ignorePayload, response.getResponseHeaders(), headerAttribsToExtract, ignoredHeaders, response.getStatus());
        HttpPayload.Builder existingHttpPayload = result.sanitizedPayload.getHttpPayload().toBuilder();
        Map<String, String> sanitizedHeaderMap = result.sanitizedPayload.getHttpPayload()
                .getHeaderMapMap();
        String originalContentType = sanitizedHeaderMap.getOrDefault("content-type", "");
        if (originalContentType == null || originalContentType.isEmpty()) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpTextPayload(response.getBodyString(), existingHttpPayload);
            return result;
        }
        String contentType = originalContentType.toLowerCase();
        if (contentType.contains("application/json")) {
            List<String> spanAttribsToExtract = new ArrayList<>();
            List<String> ignoredFields = new ArrayList<>();
            List<String> userIdBodyFields = new ArrayList<>();
            for (String uri : uris) {
                if (originalUri.matches(uri)) {
                    spanAttribsToExtract.addAll(responseExtractToSpanAttributesMap.getOrDefault(uri, new ArrayList<>()));
                    ignoredFields.addAll(responseIgnoredFieldsMap.getOrDefault(uri, new ArrayList<>()));
                    userIdBodyFields.add(responseExtractToUserIdMap.getOrDefault(uri, ""));
                }
            }

            String originalResponseBody = response.getBodyString();
            return getJsonBodyExtractResult(ignorePayload, originalResponseBody, result.spanAttributes, spanAttribsToExtract, ignoredFields, userIdBodyFields.stream()
                    .filter(field -> !field.isEmpty()).collect(Collectors.toList()), existingHttpPayload);
        } else if (contentType.contains("text/plain")) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpTextPayload(response.getBodyString(), existingHttpPayload);
            return result;
        } else if (contentType.contains("text/html")) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpHtmlPayload(response.getBodyString(), existingHttpPayload);
            return result;

        } else if (contentType.contains("text/xml") || contentType
                .contains("application/xml")) {
            result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpXmlPayload(response.getBodyString(), existingHttpPayload);
            return result;
        }
        result.sanitizedPayload = ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpTextPayload(response.getBodyString(), existingHttpPayload);
        return result;
    }

    private ExtractResult getPartialExtractionResultFromHeader(boolean ignorePayload, Map<String, String> originalHeaderMap, List<String> headerAttribsToExtract, List<String> ignoredHeaders, Integer responseCode) {
        if (ignorePayload) {
            return new ExtractResult();
        }
        Map<String, String> spanAttributes = new HashMap<>();
        if (userIdHeader != null && !userIdHeader.isEmpty() && originalHeaderMap.containsKey(userIdHeader)) {
            spanAttributes.put(Constants.USER_ID_SPAN_ATTRIBUTE, originalHeaderMap.get(userIdHeader));
        }
        if (sessionRecordTrackingIdHeader != null && !sessionRecordTrackingIdHeader.isEmpty() && originalHeaderMap.containsKey(sessionRecordTrackingIdHeader)) {
            spanAttributes.put(Constants.HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, originalHeaderMap.get(sessionRecordTrackingIdHeader));
            // The session is managed by client specified header. Therefore, no chunking.
            spanAttributes.put(Constants.HEADER_EXTRACTED_PARENT_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE, originalHeaderMap.get(sessionRecordTrackingIdHeader));
        }
        for (String headerAttrib : headerAttribsToExtract) {
            if (originalHeaderMap.containsKey(headerAttrib)) {
                spanAttributes.put(headerAttrib, originalHeaderMap.get(headerAttrib));
            }
        }
        for (String ignoredHeader : ignoredHeaders) {
            originalHeaderMap.remove(ignoredHeader);
        }
        HttpPayload.Builder builder = HttpPayload.newBuilder().putAllHeaderMap(originalHeaderMap);
        if (responseCode != null) {
            builder.setResponseCode(responseCode);
        }
        return new ExtractResult(Payload.newBuilder()
                .setHttpPayload(builder).build(), spanAttributes);
    }

    private void populateQueryParams(HttpPayload.Builder payload, CachedRequestHttpServletRequest request) {
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            // Split the query string into key-value pairs
            String[] params = queryString.split("&");
            for (String param : params) {
                String[] keyValue = param.split("=");
                if (keyValue.length == 2) {
                    // Add key-value pair to the HttpGetBody builder
                    String key = keyValue[0];
                    String value = keyValue[1];
                    payload.putQueryParamMap(key, value);
                }
            }
        }
    }

    private ExtractResult handleMultipartFormData(CachedRequestHttpServletRequest request, boolean ignorePayload, Map<String, String> spanAttributes, List<String> spanAttribsToExtract, List<String> ignoredFields, List<String> userIdBodyFields, HttpPayload.Builder existingPayload) {
        Map<String, String> keyValueMap = new HashMap<>();
        try {
            Collection<Part> parts = request.getParts();
            for (Part part : parts) {
                if (part.getSubmittedFileName() == null) { // Ignore file uploads
                    String key = part.getName();
                    if (!ignoredFields.contains(key)) {
                        String value = convertStreamToString(part.getInputStream());
                        if (spanAttribsToExtract.contains(key)) {
                            spanAttributes.put(key, value);
                        }
                        if (userIdBodyFields.contains(key)) {
                            spanAttributes.put(Constants.USER_ID_SPAN_ATTRIBUTE, value);
                        }
                        keyValueMap.put(key, value);
                    }
                }
            }
        } catch (IOException | ServletException e) {
            logger.severe("Error handling multipart/form-data: " + e.getMessage());
        }

        if (ignorePayload) {
            return new ExtractResult(Payload.getDefaultInstance(), spanAttributes);
        } else {
            Payload payload = PayloadUtils.getHttpFormDataPayload(keyValueMap, existingPayload);
            return new ExtractResult(payload, spanAttributes);
        }
    }

    private String convertStreamToString(InputStream is) throws IOException {
        StringBuilder sb = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        char[] buffer = new char[1024];
        int length;
        while ((length = reader.read(buffer)) != -1) {
            sb.append(buffer, 0, length);
        }
        return sb.toString();
    }

    private ExtractResult handleUrlEncodedFormData(CachedRequestHttpServletRequest request, boolean ignorePayload, Map<String, String> spanAttributes, List<String> spanAttributesToExtract, List<String> ignoredFields, List<String> userIdFields, HttpPayload.Builder existingHttpPayload) {
        if (ignorePayload) {
            return new ExtractResult();
        }

        // Build the HttpFormDataBody
        HttpFormUrlencodedBody.Builder builder = HttpFormUrlencodedBody.newBuilder();

        // Check if the request has form data
        String requestBody = request.getBodyString();
        String[] params = requestBody.split("&");
        for (String param : params) {
            String[] keyValue = param.split("=");
            if (keyValue.length == 2) {
                String key;
                String value;
                try {
                    key = URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8.name());
                    value = URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8.name());
                } catch (UnsupportedEncodingException e) {
                    // Handle encoding exception as needed
                    key = keyValue[0];
                    value = keyValue[1];
                }
                if (!ignoredFields.contains(key)) {
                    // Add key-value pair to the HttpFormDataBody builder
                    builder.putKeyValueMap(key, value);
                }
                if (userIdFields.contains(key)) {
                    spanAttributes.put(Constants.USER_ID_SPAN_ATTRIBUTE, value);
                }
                if (spanAttributesToExtract.contains(key)) {
                    spanAttributes.put(key, value);
                }
            }
        }

        // Set the HttpFormDataBody to the HttpPayload
        return new ExtractResult(Payload.newBuilder()
                .setHttpPayload(existingHttpPayload.setHttpFormUrlencodedBody(builder).build())
                .build(), spanAttributes);
    }

    @SneakyThrows
    private ExtractResult getJsonBodyExtractResult(Boolean ignorePayload, String originalBody, Map<String, String> spanAttributes, List<String> spanAttribsToExtract, List<String> ignoredFields, List<String> userIdBodyFields, HttpPayload.Builder existingPayload) {

        if (!spanAttribsToExtract.isEmpty() || !ignoredFields.isEmpty() || !userIdBodyFields.isEmpty()) {
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

            for (String attribute : userIdBodyFields) {
                logger.fine("Found userIdBody field config : " + attribute);
                Object value = jsonContext.read(attribute);

                List<Object> valueList = new ArrayList<>();
                if (value instanceof List) {
                    // If the value is a list, process each element
                    valueList = (List<Object>) value;
                } else {
                    valueList.add(value);
                }
                if (!valueList.isEmpty()) {
                    String strValue = String.valueOf(valueList.get(0));
                    logger.fine("Extracting " + attribute + " as " + Constants.USER_ID_SPAN_ATTRIBUTE + " with value: " + strValue);
                    spanAttributes.put(Constants.USER_ID_SPAN_ATTRIBUTE, strValue);
                }
            }

            // Return extraction result
            return new ExtractResult(ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpJsonPayload(jsonContext.jsonString(), existingPayload), spanAttributes);
        }
        return new ExtractResult(ignorePayload ? Payload.getDefaultInstance() : PayloadUtils.getHttpJsonPayload(originalBody, existingPayload), spanAttributes);
    }


    private String extractFieldName(String attribute) {
        // Extract the field name from the attribute (JSON selector)
        int lastIndex = attribute.lastIndexOf('.');
        return lastIndex != -1 ? attribute.substring(lastIndex + 1) : attribute;
    }
}
