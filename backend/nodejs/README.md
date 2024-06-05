# Aware SDK For NodeJS

This module enables Aware full stack recording capability for NodeJS based web services.

## Installation Guide

Prerequisite: Enable OpenTelemetry in your Node web service and configure to export tracing data to Aware servers. Follow steps [here](https://awarelabs.io/blog/getting-started-nodejs).

1) Run the following to install the SDK:

``` npm install aware-sdk-node@latest```

2) Use Aware SDK in your code as follows:

```
const awareSdk=require('aware-sdk-node');
...
const app = express();
...
app.use(awareSdk(<config_file_path>));
```

[Read here](https://mock.url) for more details on how to configure various aspects of the SDK behaviour such as request field masking, ignoring specific headers etc. via the configuration file.
