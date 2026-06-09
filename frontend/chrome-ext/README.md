# TestChimp Chrome Extension

Browser companion for **manual test session capture** with **scenario traceability**.

## What it does

The sidebar provides manual test session capture while you exercise your app:

- Link the session to a **test-planning scenario** (required)
- Optionally set **git branch**, **environment**, and **release**
- Capture interaction steps; add **notes** with optional element/area highlights on screenshots
- End with **Mark as passed** or **Mark as failed**
- Upload screenshots and create a manual test execution record in TestChimp

### Test Planning handoff

When you choose **Record manual test steps** from a scenario in Test Planning, the web app sends the scenario and project to the extension via `chrome.storage.local` (3-minute TTL):

| Key | Purpose |
|-----|---------|
| `pendingScenarioId` / `pendingScenarioIdReceivedAt` | Scenario to pre-select when creating a manual record |
| `pendingProjectId` / `pendingProjectIdReceivedAt` | Project to auto-select in the sidebar |

On the webapp, open the extension and click **Create Manual Test Record**. The project picker and scenario tag are pre-filled when the pending data is still valid.

## What it does not include (current build)

The following are disabled in the sidebar and not part of the current product surface:

- Script Gen tab (Playwright SmartTest generation from the extension UI)
- Bugs tab (reporting, Find Bugs, Fix in IDE)
- Scenarios tab (brainstorming, in-extension scenario authoring)
- Visual vibe coding / IDE bridge from the extension

Step capture infrastructure (`stepCaptureHandler.ts`, `background.js`) remains in the codebase for manual session recording.

## Install

[Chrome Web Store – TestChimp](https://chromewebstore.google.com/detail/testchimp-create-api-auto/ailhophdeloancmhdklbbkobcbbnbglm)

## Documentation

- Product setup guide: `/record_guide` (in-app, after sign-in)
- Public docs: [Chrome extension intro](https://docs.testchimp.io/chrome-extension/intro)

## Development

See `package.json` and `webpack.config-ext.js` for build targets. Main UI entry: `sidebar.tsx` (`ManualTestTab`).
