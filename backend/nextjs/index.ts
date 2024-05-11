// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { NextApiHandler } from 'next';
import { context, Exception, propagation, Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';


const TrackedTestsMiddleware = (handler: NextApiHandler): NextApiHandler => {
  return async (request, response) => {
    const { headers, method, url = '', httpVersion } = request;

    let span;
    // continue current trace/span
    span = trace.getSpan(context.active()) as Span;
    if (headers['trackedtest.name'] != null) {
      span.setAttribute("trackedtest.name", headers['trackedtest.name'] );
    }
    if (headers['trackedtest.suite'] != null) {
      span.setAttribute("trackedtest.suite", headers['trackedtest.suite'] );
    }
    if (headers['trackedtest.invocation_id'] != null) {
      span.setAttribute("trackedtest.invocation_id", headers['trackedtest.invocation_id'] );
    }
    if (headers['test.type'] != null) {
      span.setAttribute("test.type", headers['test.type'] );
    }
  };
};





export default TrackedTestsMiddleware;
