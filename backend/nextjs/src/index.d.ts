import { NextApiHandler } from 'next';

// Define a generic type for TrackedTestsMiddleware
type TrackedTestsMiddleware<T> = (handler: NextApiHandler<T>) => NextApiHandler<T>;

declare const trackedTestsMiddleware: TrackedTestsMiddleware<any>;

export default trackedTestsMiddleware;
