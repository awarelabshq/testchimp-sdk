# TestChimp SDK for Java (Spring)

This module enables TestChimp full stack recording capability for Java Spring web services.

## Installation Guide

Prerequisite: Enable OpenTelemetry in your Java Spring web service and configure to export tracing data to TestChimp servers. Follow steps [here](https://awarelabs.io/blog/getting-started-java).

1.Add following to your gradle file to import Aware SDK library:

```
repositories {
   maven { url = uri("https://jitpack.io") }
}

...

implementation("com.github.awarelabshq:testchimp-sdk:<latest_version>")

```

2. Add ```@EnableAspectJAutoProxy``` In your ```@SpringApplication``` annotated class (This wires up the sdk components to the spring contexts. However, the components are by default disabled, which can be enabled via property definitions).

## Configuration Guide

TestChimp SDK looks for the following properties (defined via ```application.properties``` or equivalent) to enable / disable features:

```testchimp.sdk.enabled```: true | false (default: false)

This enables the sdk and captures tracking headers (session tracking / test invocation tracking etc.)

```testchimp.request_body_capture.enabled```: true | false (default: false)

This enables request body capture on incoming requests to the service. The exact requests captured, the fields that are captured and ignored etc. are configured via request_body_captrue_config.yml file.

```testchimp.response_body_capture.enabled```: true | false (default: false)

This enables response body capture on the service. The exact responses captured, the fields that are captured and ignored etc. are configured via request_body_captrue_config.yml file.

```testchimp.sdk.config.file.path```: (default: ```classpath:testchimp_sdk_config.yml```)

This yml file details how the requests / responses should be captured (field masking, header ignoring etc.) [Read here](https://github.com/awarelabshq/aware-sdk/tree/main/backend#backend-sdk-configuration-file) for how to configure SDK behaviour via the config yml file.


## Example

An example of a Java Spring web service integrating OTel and TestChimp SDK can be found under the demo project at: https://github.com/awarelabshq/shoplify/tree/main/frontendservice.
