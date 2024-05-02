package org.trackedtests.sdk.be.java.spring;

public class Constants {

    public static final String TRACKED_TEST_NAME_HEADER_KEY = "trackedtest.name";
    public static final String TRACKED_TEST_SUITE_HEADER_KEY = "trackedtest.suite";
    public static final String TRACKED_TEST_TYPE_HEADER_KEY = "test.type";
    public static final String AWARE_SESSION_RECORD_TRACKING_ID_COOKIE_NAME = "aware.session-record-tracking-id";
    public static final String AWARE_SESSION_RECORDING_TRACKING_ID_HEADER_KEY = "aware-session-record-tracking-id";
    public static final String HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE = "http.request.header.aware-session-record-tracking-id";

    public static final String HEADER_EXTRACTED_PREFIX = "http.request.header.";

    public static final String REQUEST_PAYLOAD_SPAN_ATTRIBUTE = "http.request.payload";
    public static final String RESPONSE_PAYLOAD_SPAN_ATTRIBUTE = "http.response.payload";
   public static final String RESPONSE_HEADERS_SPAN_ATTRIBUTE = "http.response.all_headers";
    public static final String SELF_HTTP_URL_SPAN_ATTRIBUTE = "url.path.self";

}



