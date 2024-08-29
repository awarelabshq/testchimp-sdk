package org.testchimp.sdk.be.java.spring;

public class Constants {

    public static final String TRACKED_TEST_NAME_HEADER_KEY = "trackedtest.name";
    public static final String TRACKED_TEST_SUITE_HEADER_KEY = "trackedtest.suite";
    public static final String TRACKED_TEST_STEP_HEADER_KEY = "trackedtest.step";
    public static final String TRACKED_TEST_TYPE_HEADER_KEY = "trackedtest.type";
    public static final String TRACKED_TEST_INVOCATION_ID_HEADER_KEY = "trackedtest.invocation-id";
    public static final String TC_SESSION_RECORD_TRACKING_ID_COOKIE_NAME = "testchimp.session-record-tracking-id";
    public static final String TC_PARENT_SESSION_RECORD_TRACKING_ID_COOKIE_NAME = "testchimp.parent-session-record-tracking-id";
    public static final String TC_SESSION_RECORDING_TRACKING_ID_HEADER_KEY = "testchimp-session-record-tracking-id";
    public static final String TC_PARENT_SESSION_RECORDING_TRACKING_ID_HEADER_KEY = "testchimp-parent-session-record-tracking-id";
    public static final String TC_CURRENT_USER_ID_HEADER_KEY = "testchimp-current-user-id";
    public static final String HEADER_EXTRACTED_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE = "http.request.header.testchimp-session-record-tracking-id";
    public static final String HEADER_EXTRACTED_PARENT_SESSION_RECORDING_TRACKING_ID_SPAN_ATTRIBUTE = "http.request.header.testchimp-parent-session-record-tracking-id";

    public static final String HEADER_EXTRACTED_PREFIX = "http.request.header.";

    public static final String REQUEST_PAYLOAD_SPAN_ATTRIBUTE = "testchimp.derived.request.payload";
    public static final String RESPONSE_PAYLOAD_SPAN_ATTRIBUTE = "testchimp.derived.response.payload";
    public static final String SELF_HTTP_URL_SPAN_ATTRIBUTE = "testchimp.derived.url.path.self";
    public static final String USER_ID_SPAN_ATTRIBUTE = "testchimp.derived.user.id";

}



