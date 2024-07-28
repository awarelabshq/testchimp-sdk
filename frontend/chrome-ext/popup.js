document.addEventListener('DOMContentLoaded', function() {
    const controlButton = document.getElementById('controlButton');
    const lastSessionElement = document.getElementById('lastSessionLink');
    const tooltipElement = document.getElementById('tooltip');

    // Function to handle session capture
    function handleSessionCapture() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const url = new URL(tabs[0].url);

            // Check for the session cookie
            chrome.cookies.get({
                url: `${url.protocol}//${url.host}`,
                name: 'testchimp.ext-session-record-tracking-id'
            }, function(cookie) {
                if (cookie) {
                    // There is an active session
                    const sessionId = cookie.value;
                    controlButton.textContent = 'End capture';
                    controlButton.style.backgroundColor = '#f44336'; // Red color
                    controlButton.style.display = 'block';

                    controlButton.addEventListener('click', function endCapture() {
                        chrome.storage.sync.get([
                            'projectId'
                        ], function(items) {
                          const sessionLink = `https://prod.testchimp.io/replay?session_id=${sessionId}&project_id=${items.projectId}`;
                          lastSessionElement.innerHTML = `<br></br>session capture <a href="${sessionLink}" target="_blank">link</a>`;

                          chrome.tabs.sendMessage(tabs[0].id, {
                              action: 'endTCRecording',
                              data: {}
                          });

                          controlButton.textContent = 'Start capture';
                          controlButton.style.backgroundColor = '#4CAF50'; // Green color

                          // Remove this event listener
                          controlButton.removeEventListener('click', endCapture);
                       });
                    });
                } else {
                    // No active session
                    lastSessionElement.innerHTML = '';
                    controlButton.textContent = 'Start capture';
                    controlButton.style.backgroundColor = '#4CAF50'; // Green color
                    controlButton.style.display = 'block';

                    controlButton.addEventListener('click', function startCapture() {
                        // Retrieve settings from storage
                        chrome.storage.sync.get([
                            'projectId',
                            'sessionRecordingApiKey',
                            'endpoint',
                            'maxSessionDurationSecs',
                            'eventWindowToSaveOnError',
                            'uriRegexToIntercept'
                        ], function(items) {
                            if (chrome.runtime.lastError) {
                                console.error('Error retrieving settings from storage:', chrome.runtime.lastError);
                                return;
                            }

                            // Send message to content script to start recording
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'startTCRecording',
                                data: {
                                    projectId: items.projectId,
                                    sessionRecordingApiKey: items.sessionRecordingApiKey,
                                    endpoint: items.endpoint,
                                    samplingProbabilityOnError: 0.0,
                                    samplingProbability: 1.0,
                                    maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
                                    eventWindowToSaveOnError: 200,
                                    untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
                                }
                            });

                            // Update the UI to reflect an active session
                            controlButton.textContent = 'End capture';
                            controlButton.style.backgroundColor = '#f44336'; // Red color

                            // Remove this event listener
                            controlButton.removeEventListener('click', startCapture);
                        });
                    });
                }
            });
        });
    }

    // Check for projectId and display appropriate message or control button
    chrome.storage.sync.get(['projectId'], function(items) {
        if (!items.projectId) {
            tooltipElement.textContent = 'Configure project Id & API key at extension options first.';
            controlButton.style.display = 'none';
        } else {
            // Load the current session state
            handleSessionCapture();
        }
    });
});