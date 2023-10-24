Tracked Tests for NextJs

This package enables Tracked Tests functionality for NextJs backends. To read more about benefits of Tracked Tests, refer: https://github.com/awarelabshq/tracked-tests#tracked-tests

To use this package:  

Install the library via npm:

npm install tracked-tests-nextjs

Update your pages/api handlers to utilize the TrackedTestMiddleware:

...

export default TrackedTestsMiddleware(yourApiHandler);
