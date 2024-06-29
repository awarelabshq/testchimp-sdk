const api = require('@opentelemetry/api');
const url = require('url');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const yaml = require('js-yaml');
const jsonpath = require('jsonpath');

// Create a multer instance for multipart form-data parsing
const upload = multer();

// Initialize body parsers
const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({
    extended: true
});

const Constants = {
    TRACKED_TEST_NAME_HEADER_KEY: 'trackedtest.name',
    TRACKED_TEST_SUITE_HEADER_KEY: 'trackedtest.suite',
    TRACKED_TEST_STEP_HEADER_KEY: 'trackedtest.step',
    TRACKED_TEST_TYPE_HEADER_KEY: 'trackedtest.type',
    TESTCHIMP_SESSION_RECORD_TRACKING_ID_HEADER_KEY: 'testchimp-session-record-tracking-id',
    TESTCHIMP_USER_ID_HEADER_KEY:'testchimp-current-user-id',
    USER_ID_SPAN_ATTRIBUTE:'testchimp.derived.user.id',
    HEADER_EXTRACTED_PREFIX: 'header.extracted.'
};

let log_level="none";
let session_record_tracking_id_header=Constants.TESTCHIMP_SESSION_RECORD_TRACKING_ID_HEADER_KEY;
let enable_options_call_tracking=false;

function log(stmt,level){
    if(level=="fine" && log_level!="none"){
        console.log(stmt);
    }else if(level=="info" && (log_level=="info" || log_level=="fine")){
        console.log(stmt);
    }else if(level=="severe" && (log_level=="info" || log_level=="fine" || log_level=="severe")){
        console.log(stmt);
    }
}

function getContentType(headers) {
    for(const key in headers) {
        if(key.toLowerCase() === 'content-type') {
            return headers[key].toLowerCase();
        }
    }
    // Default to plain text content type if not found
    return 'text/plain';
}

function parseConfig(configFilePath) {
    let config = {};
    if(configFilePath) {
        try {
            const configFile = fs.readFileSync(configFilePath, 'utf8');
            config = yaml.load(configFile);
        } catch (error) {
            console.error(`Failed to load config file: ${error.message}`);
        }
    }
    return config;
}

function createMappings(config) {
    const mappings = {
        ignoredUrls: [],
        ignoredHeaders: new Set(),
        urlSpecificConfig: []
    };

    if(config.global_config) {
        if(config.global_config.ignored_urls) {
            mappings.ignoredUrls = config.global_config.ignored_urls.map(pattern => new RegExp(pattern));
        }
        if(config.global_config.ignored_headers) {
            config.global_config.ignored_headers.forEach(header => mappings.ignoredHeaders.add(header));
        }
        if(config.global_config.log_level){
            log_level=config.global_config.log_level;
        }
        if(config.global_config.session_record_tracking_id_header){
            session_record_tracking_id_header=config.global_config.session_record_tracking_id_header;
        }
        if(config.global_config.enable_options_call_tracking){
            enable_options_call_tracking=config.global_config.enable_options_call_tracking;
        }
    }

    if(config.url_configs) {
        Object.keys(config.url_configs).forEach(urlPattern => {
            const urlConfig = config.url_configs[urlPattern];
            const requestConfig = urlConfig.request || {};
            const responseConfig = urlConfig.response || {};

            mappings.urlSpecificConfig.push({
                pattern: new RegExp(urlPattern),
                config: {
                    request: {
                        ignoredHeaders: new Set(requestConfig.ignored_headers || []),
                        ignoredFields: requestConfig.ignored_fields || [],
                        extractToSpanAttributes: requestConfig.extract_to_span_attributes || [],
                        extractHeadersToSpanAttributes: requestConfig.extract_headers_to_span_attributes || [],
                        userIdField: requestConfig.user_id_field || null
                    },
                    response: {
                        ignoredHeaders: new Set(responseConfig.ignored_headers || []),
                        ignoredFields: responseConfig.ignored_fields || [],
                        extractToSpanAttributes: responseConfig.extract_to_span_attributes || [],
                        extractHeadersToSpanAttributes: responseConfig.extract_headers_to_span_attributes || [],
                        userIdField: responseConfig.user_id_field || null
                    }
                }
            });
        });
    }

    return mappings;
}

function safeSet(obj, path, value) {
    const keys = Array.isArray(path) ? path : path.match(/[^.[\]]+/g) || [];
    keys.slice(0, -1).reduce((acc, key) => acc[key] = acc[key] || {}, obj)[keys.slice(-1)[0]] = value;
}

function processJsonBody(body, span, config, type) {
    const ignoredFields = config[type].ignoredFields;
    const extractToSpanAttributes = config[type].extractToSpanAttributes;
    const userIdField = config[type].userIdField;
    // Scrub ignored fields
    ignoredFields.forEach(query => {
        const matches = jsonpath.paths(body, query);
        matches.forEach(matchPath => {
            const lastSegment = matchPath.pop();
            const parentPath = jsonpath.stringify(matchPath);
            const parent = jsonpath.query(body, parentPath)[0];
            if(parent && lastSegment in parent) {
                parent[lastSegment] = "";
            }
        });
    });

    // Extract fields to span attributes
    extractToSpanAttributes.forEach(query => {
        const matches = jsonpath.query(body, query);
        if(matches.length > 0) {
            const firstMatch = matches[0];
            const fieldName = query.match(/[^.[\]]+$/)[0];
            log("Setting " + `testchimp.extracted.${fieldName}` + " in " + type + " " + firstMatch,"fine");
            span.setAttribute(`testchimp.extracted.${fieldName}`, firstMatch);
        }
    });

    // Extract user ID field to span attribute
    if(userIdField) {
        const userIdMatches = jsonpath.query(body, userIdField);
        if(userIdMatches.length > 0) {
           log("Setting derived user id for session " + userIdMatches[0],"fine");
           span.setAttribute(Constants.USER_ID_SPAN_ATTRIBUTE, userIdMatches[0]);
        }
    }

    return JSON.stringify(body);
}

function processOtherBodyTypes(body, span, config, type) {
    const ignoredFields = config[type].ignoredFields;
    const extractToSpanAttributes = config[type].extractToSpanAttributes;

    // Scrub ignored fields
    ignoredFields.forEach(field => {
        if(field === '$') {
            body = "";
        }
    });

    // Extract fields to span attributes
    extractToSpanAttributes.forEach(field => {
        if(field === '$' && body) {
          log("Setting attribute: testchimp.extracted.body to " + body + " for " + type,"fine");
          span.setAttribute('testchimp.extracted.body', body);
        }
    });

    return body;
}

function extractTrackingHeaders(req, span) {
    const headers = req.headers;

    const trackedTestSuite = headers[Constants.TRACKED_TEST_SUITE_HEADER_KEY];
    const trackedTestCase = headers[Constants.TRACKED_TEST_NAME_HEADER_KEY];
    const trackedTestType = headers[Constants.TRACKED_TEST_TYPE_HEADER_KEY];
    const trackedTestStep = headers[Constants.TRACKED_TEST_STEP_HEADER_KEY];
    const headerExtractedSessionRecordingTrackingId = headers[session_record_tracking_id_header];
    const headerExtractedCurrentUserId = headers[Constants.TESTCHIMP_USER_ID_HEADER_KEY];

    if (headerExtractedSessionRecordingTrackingId) {
        span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TESTCHIMP_SESSION_RECORD_TRACKING_ID_HEADER_KEY, headerExtractedSessionRecordingTrackingId);
    }
    if (headerExtractedCurrentUserId) {
        span.setAttribute(Constants.USER_ID_SPAN_ATTRIBUTE, headerExtractedCurrentUserId);
    }
    if (trackedTestSuite) {
        span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_SUITE_HEADER_KEY, trackedTestSuite);
    }
    if (trackedTestStep) {
        span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_STEP_HEADER_KEY, trackedTestStep);
    }
    if (trackedTestCase) {
        span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_NAME_HEADER_KEY, trackedTestCase);
    }
    if (trackedTestType) {
        span.setAttribute(Constants.HEADER_EXTRACTED_PREFIX + Constants.TRACKED_TEST_TYPE_HEADER_KEY, trackedTestType);
    }
}

function testchimpSdk(configFilePath) {
    const config = parseConfig(configFilePath);
    const mappings = createMappings(config);

    return (req, res, next) => {
        const span = api.trace.getSpan(api.context.active());
        extractTrackingHeaders(req,span);

        // Check if the URL matches any ignored URL pattern
        const parsedUrl = url.parse(req.url, true);
        const urlPath = parsedUrl.pathname;

        let urlConfigEntry = mappings.urlSpecificConfig.find(entry => entry.pattern.test(urlPath));
        if(!urlConfigEntry) {
            urlConfigEntry = {
                config: {
                    request: {},
                    response: {}
                }
            }; // Assign empty config if no match
        }

        // Parse request body based on content-type
        const parseRequestBody = (callback) => {
            const contentType = getContentType(req.headers);

            if(contentType.includes('application/json')) {
                jsonParser(req, res, callback);
            } else if(contentType.includes('application/x-www-form-urlencoded')) {
                urlencodedParser(req, res, callback);
            } else if(contentType.includes('multipart/form-data')) {
                upload.any()(req, res, callback);
            } else {
                callback();
            }
        };

        // Process the request payload
        parseRequestBody((err) => {
            if(span) {
                if(err) {
                    console.error('Error parsing request body:', err);
                }

                const queryParamMap = parsedUrl.query;
                const headers = req.headers;
                const method = req.method;
                let requestBody = req.body;
                let bodyType;

                if(headers['content-type'].includes('application/json')) {
                    bodyType = 'json_body';
                    requestBody = JSON.stringify(requestBody); // Ensure the request body is a JSON string
                } else if(headers['content-type'].includes('application/x-www-form-urlencoded')) {
                    bodyType = 'http_form_urlencoded_body';
                } else if(headers['content-type'].includes('multipart/form-data')) {
                    bodyType = 'http_form_data_body';
                } else {
                    bodyType = 'text_body';
                }
                // Process request headers
                urlConfigEntry.config.request.ignoredHeaders.forEach(header => {
                    delete headers[header];
                });

                // Process request body
                if(bodyType === 'json_body') {
                    requestBody = processJsonBody(JSON.parse(requestBody), span, urlConfigEntry.config, 'request');
                } else {
                    requestBody = processOtherBodyTypes(requestBody, span, urlConfigEntry.config, 'request');
                }

                // Extract request headers to span attributes
                urlConfigEntry.config.request.extractHeadersToSpanAttributes.forEach(header => {
                    const headerValue = headers[header];
                    if(headerValue) {
                        log("Setting attribute: " + `testchimp.extracted.${header}` + " to " + headerValue + " in request","fine");
                        span.setAttribute(`testchimp.extracted.${header}`, headerValue);
                    }
                });

                const httpPayload = {
                    header_map: headers,
                    query_param_map: queryParamMap,
                    http_method: method,
                    [bodyType]: requestBody
                };

                const payload = {
                    span_id: span.spanContext().spanId,
                    http_payload: httpPayload
                };

                const payloadString = JSON.stringify(payload);
                log("request payload: " + payloadString,"info");
                if(method!="OPTIONS" || (enable_options_call_tracking && method==="OPTIONS")){
                    span.setAttribute('testchimp.derived.request.payload', payloadString);
                    span.setAttribute('testchimp.derived.url.path.self', urlPath);
                }
            }

            const originalEnd = res.end;
            res.end = function(...args) {
                if(span) {
                    let responseBody = args[0] instanceof Buffer ? args[0].toString() : args[0];
                    const responseHeaders = res.getHeaders(); // Get response headers
                    urlConfigEntry.config.response.ignoredHeaders.forEach(header => {
                        delete responseHeaders[header];
                    });

                    // Get response content type
                    const contentType = getContentType(responseHeaders);
                    let responseBodyType;

                    if(contentType) {
                        if(contentType.includes('application/json')) {
                            responseBodyType = 'json_body';
                        } else if(contentType.includes('text/plain')) {
                            responseBodyType = 'text_body';
                        } else if(contentType.includes('text/html') || contentType.includes('application/xml') || contentType.includes('text/xml')) {
                            responseBodyType = 'xml_body';
                        } else if(contentType.includes('application/x-www-form-urlencoded')) {
                            responseBodyType = 'http_form_urlencoded_body';
                        } else if(contentType.includes('multipart/form-data')) {
                            responseBodyType = 'http_form_data_body';
                        } else {
                            responseBodyType = 'binary_data_body';
                        }

                        const responseBodyPayload = {};
                        if(responseBodyType === 'json_body') {
                            responseBody = processJsonBody(JSON.parse(responseBody), span, urlConfigEntry.config, 'response');
                        } else {
                            responseBody = processOtherBodyTypes(responseBody, span, urlConfigEntry.config, 'response');
                        }
                        responseBodyPayload[responseBodyType] = responseBody;

                        // Process response body

                        // Extract response headers to span attributes
                        urlConfigEntry.config.response.extractHeadersToSpanAttributes.forEach(header => {
                            const headerValue = responseHeaders[header];
                            if(headerValue) {
                               log("Setting attribute: " + `testchimp.extracted.${header}` + " to " + headerValue + " in response","fine");
                               span.setAttribute(`testchimp.extracted.${header}`, headerValue);
                            }
                        });

                        const responsePayload = {
                            [responseBodyType]: responseBody,
                            header_map: responseHeaders,
                            response_code: res.statusCode
                        };

                        const responsePayloadMessage = {
                            span_id: span.spanContext().spanId,
                            http_payload: responsePayload
                        };

                        const responsePayloadString = JSON.stringify(responsePayloadMessage);
                        log("response payload: " + responsePayloadString,"info");
                        span.setAttribute('testchimp.derived.response.payload', responsePayloadString);
                    }
                }
                originalEnd.apply(res, args);
            };

            next(); // Proceed to next middleware regardless of any errors during parsing
        });
    };
}

module.exports = testchimpSdk;