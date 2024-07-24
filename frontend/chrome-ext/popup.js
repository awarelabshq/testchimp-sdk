document.addEventListener('DOMContentLoaded', function() {
    const sessionStartTimeElement = document.getElementById('sessionStartTime');
    const endSessionButton = document.getElementById('endSessionButton');
    const lastSessionElement = document.createElement('div');
    sessionStartTimeElement.after(lastSessionElement); // Add the new element after sessionStartTimeElement

    // Load the current session start time
    chrome.storage.local.get('currentSessionStartTime', function(items) {
        const startTime = items.currentSessionStartTime;
        console.log("Current session start time ",startTime);
        // Retrieve pluginEnabledUrls to check against the current tab URL
        chrome.storage.sync.get(['pluginEnabledUrls'], function(items) {
            const pluginEnabledUrls = items.pluginEnabledUrls;

            // Check if pluginEnabledUrls is configured
            if (!pluginEnabledUrls) {
                sessionStartTimeElement.textContent = 'No URLs configured for capture. Go to extension settings -> URL (regex) to enable extension for this site.';
                endSessionButton.style.display = 'none'; // Hide the button
                return;
            }

            // Get the current active tab URL
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const tabUrl = tabs[0].url;
                const urlRegex = new RegExp(pluginEnabledUrls);

                // Check if the current tab URL matches the regex
                if (!urlRegex.test(tabUrl)) {
                    sessionStartTimeElement.textContent = 'No active session. URL does not match regex for capturing in extension options.';
                    endSessionButton.style.display = 'none'; // Hide the button
                } else {
                    if (startTime) {
                        // Format and display the start time
                        const formattedStartTime = new Date(parseInt(startTime)).toLocaleString();
                        sessionStartTimeElement.textContent = "Current session active since: " + formattedStartTime;

                        // Show the End Current Session button
                        endSessionButton.style.display = 'block';
                    } else {
                        sessionStartTimeElement.textContent = 'No current active session.';
                        endSessionButton.style.display = 'none'; // Hide the button
                    }
                }
            });
        });
    });

    // Handle the End Current Session button click
    endSessionButton.addEventListener('click', function() {
        // Get the current session cookie value
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function(tabs) {
            const url = new URL(tabs[0].url);

            chrome.cookies.get({
                url: `${url.protocol}//${url.host}`,
                name: 'testchimp.session-record-tracking-id'
            }, function(cookie) {
                if (cookie) {
                    const sessionId = cookie.value;
                    const sessionLink = `https://prod.testchimp.io/replay?session_id=${sessionId}`;
                    lastSessionElement.innerHTML = `<br></br>Last session capture: <a href="${sessionLink}" target="_blank">link</a>`;
                }

                // Clear the session cookie from the current active tab
                const tabId = tabs[0].id;

                chrome.cookies.remove({
                    url: `${url.protocol}//${url.host}`,
                    name: 'testchimp.session-record-tracking-id'
                }, function() {
                    console.log('Session cookie removed');
                });

                // Clear the session start time
                chrome.storage.local.remove('currentSessionStartTime', function() {
                    console.log('Session start time cleared');
                });

                // Optionally, you can also reload the tab
                chrome.tabs.reload(tabId);
            });
        });
    });
});