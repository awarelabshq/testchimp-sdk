const api = require('opentelemetry-api');

function interceptRequest(req, res, next) {
  const span = api.trace.getSpan(api.context.active());

  if (span) {
    span.setAttribute('http.request.payload', JSON.stringify(req.body));
    span.setAttribute('http.request.method', req.method);
    span.setAttribute('http.request.url', req.url);
  }

  const originalEnd = res.end;
  res.end = function(...args) {
    if (span) {
      span.setAttribute('http.response.payload', JSON.stringify(args[0]));
    }
    originalEnd.apply(res, args);
  };

  next(); // Call next() before intercepting the response
}

module.exports = interceptRequest;