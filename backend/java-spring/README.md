This module enables Aware full stack recording capability for Java Spring web services.

### Java (Spring)

#### Installation Guide

1) Add following to your gradle file to import Aware SDK library:

```
repositories {
   maven { url = uri("https://jitpack.io") }
}

...

implementation("com.github.awarelabshq:aware-sdk:0.0.1")

```

2) Add ```@EnableAspectJAutoProxy``` In your ```@SpringApplication``` annotated class (This wires up the sdk components to the spring contexts. However, the components are by default disabled, which can be enabled via property definitions).

#### Configuration Guide

Aware SDK looks for the following properties (defined via ```application.properties``` or equivalent) to enable / disable features:

```aware.sdk.enabled```: true | false (default: false)

This enables the sdk and captures tracking headers (session tracking / test invocation tracking etc.)

```aware.request_body_capture.enabled```: true | false (default: false)

This enables request body capture on incoming requests to the service. The exact requests captured, the fields that are captured and ignored etc. are configured via request_body_captrue_config.yml file.

```aware.response_body_capture.enabled```: true | false (default: false)

This enables response body capture on the service. The exact responses captured, the fields that are captured and ignored etc. are configured via request_body_captrue_config.yml file.

```aware.request_body_capture.config.file.path```: (default: ```classpath:aware_request_body_capture_config.yml```)

This yml file details how the requests / responses should be captured (field masking, header ignoring etc.) Refer to Aware Request Capture Config section for more details.

### Aware Request / Response Capture Configuration

Aware backend sdks request / response capture behaviour can be configured via a yml file with the following structure:

```
global_config:
  # payload of urls that match this set will not be captured
  ignored_urls:
    - ".*/admin/get_detailed_user_info"
  # globally, the following headers will not be captured
  ignored_headers:
    - "Authorization"
  # If there is a user id field passed as a header, it can be specified here. This will be used to tag the session to
  # the given user so that sessions for a given test user can be queried later from Aware Studio. This is only expected
  # to be extracted in test environments and not prod for PII preservation.
  user_id_header: "x-user-id"
  # Enable tracking http calls with OPTIONS method. Defaults to false.
  enable_options_call_tracking: true | false
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
      # Headers listed below will be captured as separate span attributes. The name of the attribute will be the name of the header field.
      extract_headers_to_span_attributes:
        - "project_id"
      # If the unique user id is part of the body (either response or request) rather than a header, the json path to
      # the body element can be specified here. This will be used to extract and tag each session to the corresponding
      # test user so that sessions for a given user can be queried via Aware Studio. This is only recommended in test
      # envs to preserve PII in prod.
      user_id_field:
        "$.user_info.user_id"
```

For example, the following configuration does the following:
1) Ignore ```Authorization``` header from all requests / responses
2) Ignore payload capturing for all urls matching ```.*/health/.*```
3) Captures request & response payloads for urls matching ```.*/user/.*```. Ignores ```$.password``` field in json request body.
4) Captures _only_ request payloads for urls matching ```.*/admin/.*```. Captures ```$.user_info.email``` json field as user_id of the requestor (which enables teams to find sessions corresponding to a given test user via Aware Studio)

Sample Config:

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

