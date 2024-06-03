This module enables Aware full stack recording capability for NodeJS based web services.

### NodeJS

#### Installation Guide

1) Run the following to install the SDK:

``` npm install aware-sdk-node```

2) In your code, do:

```
const awareSdk=require('./aware-sdk');
...
const app = express();
...
app.use(awareSdk);
```

Advanced configuration can be done by providing an aware sdk config yml file. [Read here](https://mock.url) for more details on how to configure various aspects of the SDK behaviour such as request field masking, ignoring specific headers etc.
