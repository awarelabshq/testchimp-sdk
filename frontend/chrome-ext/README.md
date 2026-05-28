# TestChimp Chrome Extension

Browser companion for **SmartTest script generation** and **manual test session capture** with **scenario traceability**.

## What it does

The extension exposes two tabs in the sidebar:

### Manual

Record a manual test session while exercising your app:

- Link the session to a **test-planning scenario** (required)
- Optionally set **git branch**, **environment**, and **release**
- Capture interaction steps; add **notes** with optional element/area highlights on screenshots
- End with **Mark as passed** or **Mark as failed**
- Upload screenshots and create a manual test execution record in TestChimp

### Script Gen

Capture interactions and generate **Playwright SmartTests**:

- Start/end step capture with assertion modes (visible, text, value, enabled/disabled, count)
- Cycle through multiple selector options per step
- Create SmartTests in your project; optional linkage to a scenario when started from Test Planning

## What it does not include (current build)

The following are disabled in the sidebar and not part of the current product surface:

- Bugs tab (reporting, Find Bugs, Fix in IDE)
- Scenarios tab (brainstorming, in-extension scenario authoring)
- Visual vibe coding / IDE bridge from the extension

## Install

[Chrome Web Store – TestChimp](https://chromewebstore.google.com/detail/testchimp-create-api-auto/ailhophdeloancmhdklbbkobcbbnbglm)

## Documentation

- Product setup guide: `/record_guide` (in-app, after sign-in)
- Public docs: [Chrome extension intro](https://docs.testchimp.io/chrome-extension/intro)

## Development

See `package.json` and `webpack.config-ext.js` for build targets. Main UI entry: `sidebar.tsx` (`ManualTestTab`, `RecordTestTab`).
