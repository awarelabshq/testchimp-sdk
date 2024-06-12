# TestChimp SDK For NodeJS

This module enables TestChimp full stack recording capability for NodeJS based web services.

## Installation Guide

Prerequisite: Enable OpenTelemetry in your Node web service and configure to export tracing data to TestChimp servers. Follow steps [here](https://awarelabs.io/blog/getting-started-nodejs).

1) Run the following to install the SDK:

``` npm install testchimp-node@latest```

2) Use TestChimp SDK in your code as follows:

```
const testChimpSdk=require('testchimp-node');
...
const app = express();
...
app.use(testChimpSdk(<config_file_path>));
```

## Configuration Guide

TestChimp SDK behaviour can be configured via a yml file passed in to testChimpSdk() function. [Read here](https://github.com/awarelabshq/aware-sdk/tree/main/backend#backend-sdk-configuration-file) for more details on how to configure various aspects of the SDK behaviour such as request field masking, ignoring specific headers etc. via the configuration file.

## Example

An example of NodeJS based webservice integrating with OTel and TestChimp SDK can be found at the demo project at: https://github.com/awarelabshq/shoplify/tree/main/riskservice
