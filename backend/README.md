# Aware Backend SDK Module

This module includes different backend SDKs for tech stacks supported by TestChimp. After installing the frontend SDK in your client, you can install the corresponding backend SDKs to leverage full stack recording capabilities of Aware.

Note: Enable OpenTelemetry in your backend services prior to installing TestChimp SDKs as it relies on OTel for connecting the full journey of requests.
Refer [here](https://www.testchimp.io/blog/getting-started-with-testchimp) for details on how to setup OTel and export tracing data to TestChimp servers.

Currently, support is available for following:
1. Java (Spring)
2. NodeJS

## Backend SDK Configuration File

All backend SDKs can be configured via an ```testchimp_sdk_config.yml``` file, whose format is as follows:

```
global_config:
  # log level for SDK.
  log_level: "info"
  
  # payload of urls that match this set will not be captured
  ignored_urls:
    - ".*/admin/get_detailed_user_info"
  
  # globally, the following headers will not be captured
  ignored_headers:
    - "Authorization"
  
  # If there is a user id field passed as a header, it can be specified here. This will be used to tag the session to
  # the given user so that sessions for a given test user can be queried later from TestChimp Studio. This is only expected
  # to be extracted in test environments and not prod for PII preservation.
  user_id_header: "x-user-id"

  # By default, TestChimp uses the testchimp-session-record-tracking-id header for grouping traces belonging to a single
  # session (which is injected by testchimp frontend SDKs). If however, a custom application specific session tracking
  # id is used, that can be specified here. This is useful for mobile apps which already has some application specific
  # session tracking mechanism and they want to reuse the same for grouping the traces by the session.
  session_record_tracking_id_header: "testchimp-session-record-tracking-id"
  
  # Enables tracking HTTP Options calls (defaults to false)
  enable_options_call_tracking: true

url_configs:
  # Each section is formatted as "url_pattern" under which:
  # request - section will describe how requests are captured for uris matching the url_pattern (if request block not present, request won't be captured)
  # response - section will describe how responses are captured for uris matching the url_pattern (if response block not present, response won't be captured)

  .*/admin/.*:
    request:
  
    response:
    
      # listed headers under this will be specifically not captured for this url_pattern
      ignored_headers:
        - "User-Auth-Token"
      
      # fields matching the following json path queries will be ignored in the captured request / response.
      ignored_fields:
        - "$.results[*].items[*].bar"
      
      # fields matching the following json queries will be captured as span attributes (the name of the span attribute will be the name of the field). If there are multiple matches, the values will be concat using ","
      extract_to_span_attributes:
        - "$.results[*].item_type"
      
      # Headers listed below will be captured as separate span attributes. The name of the attribute will be the name of the header field".
      extract_headers_to_span_attributes:
        - "project_id"
      
      # If the unique user id is part of the body (either response or request) rather than a header, the json path to
      # the body element can be specified here. This will be used to extract and tag each session to the corresponding
      # test user so that sessions for a given user can be queried via TestChimp Platform. This is only recommended in test
      # envs to preserve PII in prod.
      user_id_field: "$.user_info.user_id"
```

For example, the following configuration does the following:
1) Ignore ```Authorization``` header from all requests / responses
2) Ignore payload capturing for all urls matching ```.*/health/.*```
3) Captures request & response payloads for urls matching ```.*/user/.*```. Ignores ```$.password``` field in json request body.
4) Captures _only_ request payloads for urls matching ```.*/admin/.*```. Captures ```$.user_info.email``` json field as user_id of the requestor (which enables teams to find sessions corresponding to a given test user via Aware Studio)

### Sample Config:

```
global_config:
  ignored_urls:
    - ".*/health/.*
  ignored_headers:
    - "Authorization"
url_configs:
  .*/user/.*:
    request:
      ignored_fields:
        - "$.password
    response:
  .*/admin/.*:
    request:
      user_id_field:
        "$.user_info.email"
```

