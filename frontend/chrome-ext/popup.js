import { formatTimeAgo } from './time_utils';
import { UI_BASE_URL } from './config.js';

const MAX_RECENT_SESSIONS = 10;

function showRecentSessions() {
    const recentSessionsContainer = document.getElementById('recentSessions');
    recentSessionsContainer.innerHTML = ''; // Clear previous sessions

    chrome.storage.local.get("recentSessions", function(data) {
        const recentSessions = data.recentSessions || [];

        // Sort sessions by timestamp in descending order (latest first)
        recentSessions.sort((a, b) => b.timestamp - a.timestamp);

        recentSessions.forEach(session => {
            const link = document.createElement('a');
            link.href = session.url;
            link.target = '_blank';
            link.textContent = formatTimeAgo(session.timestamp); // Display only time
            link.style.display = 'block'; // Show each session in a new line
            recentSessionsContainer.appendChild(link);
        });
    });
}

function addSessionToHistory(sessionLink) {
    const timestamp = Date.now();

    // Retrieve existing sessions from local storage
    chrome.storage.local.get("recentSessions", function(data) {
        const recentSessions = data.recentSessions || [];

        // Add the new session to the history
        recentSessions.push({ url: sessionLink, timestamp });

        // Limit the number of sessions
        if (recentSessions.length > MAX_RECENT_SESSIONS) {
            recentSessions.shift(); // Remove the oldest session
        }

        // Save the updated session history to local storage
        chrome.storage.local.set({ recentSessions: recentSessions }, function() {
            showRecentSessions(); // Display updated sessions
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const startButton = document.getElementById('startCapture');
    const endButton = document.getElementById('endCapture');
    const lastSessionElement = document.getElementById('lastSessionLink');
    const tooltipElement = document.getElementById('tooltip');
    const recentSessionsButton = document.getElementById('recentSessionsButton');
    const recentSessionsContainer = document.getElementById('recentSessions');

    let isExpanded = false; // State to track if the recent sessions are expanded

    recentSessionsButton.addEventListener('click', function() {
        isExpanded = !isExpanded; // Toggle expanded state
        if(isExpanded){
        recentSessionsButton.textContent=" - Hide";
        }else{
        recentSessionsButton.textContent="+ Recent Sessions";
        }
        recentSessionsContainer.style.display = isExpanded ? 'block' : 'none'; // Show/hide the recent sessions

    });

    function handleSessionCapture() {
        // Check for the session ID in chrome.storage.local
        chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function(data) {
            if (data["testchimp.ext-session-record-tracking-id"]) {
                // Active session
                const sessionId = data["testchimp.ext-session-record-tracking-id"];
                showEndCapture(sessionId);
            } else {
                // No active session
                showStartCapture();
            }
        });
    }

    function showStartCapture() {
        startButton.style.display = 'block';
        endButton.style.display = 'none';

        startButton.addEventListener('click', function startCapture() {
            chrome.storage.sync.get([
                'projectId',
                'sessionRecordingApiKey',
                'endpoint',
                'maxSessionDurationSecs',
                'eventWindowToSaveOnError',
                'uriRegexToIntercept',
                'currentUserId'
            ], function (items) {
                if (chrome.runtime.lastError) {
                    console.error('Error retrieving settings from storage:', chrome.runtime.lastError);
                    alert("Error receiving configuration details. Please try refreshing the page.");
                    return;
                }
                chrome.storage.local.set({ recordingInProgress: true }, function () {
                    if (chrome.runtime.lastError) {
                        console.error('Error setting recording flag:', chrome.runtime.lastError);
                    }
                });
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
                            currentUserId:items.currentUserId,
                            untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
                        }
                    });
                    lastSessionElement.innerHTML = '';
                    showEndCapture();
                });
            });
        });
    }

    function showEndCapture(sessionId) {
        startButton.style.display = 'none';
        endButton.style.display = 'block';

        endButton.addEventListener('click', function endCapture() {
            chrome.storage.sync.get(['projectId'], function (items) {
                const sessionLink = `${UI_BASE_URL}/replay?session_id=${sessionId}&project_id=${items.projectId}`;
                lastSessionElement.innerHTML = `Captured session: <a href="${sessionLink}" target="_blank">link</a>`;
                addSessionToHistory(sessionLink);
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'endTCRecording',
                        data: {}
                    });
                    clearTrackingIdCookie();
                    showStartCapture();
                    chrome.storage.local.set({ recordingInProgress: false }, function () {
                        if (chrome.runtime.lastError) {
                            console.error('Error setting recording flag:', chrome.runtime.lastError);
                        }
                    });
                });
            });
        });
    }

    chrome.storage.sync.get(['projectId', 'sessionRecordingApiKey', 'uriRegexToIntercept'], function (items) {
    const tooltipElement = document.getElementById('tooltip');
    if (!items.projectId || !items.sessionRecordingApiKey || !items.uriRegexToIntercept) {
        tooltipElement.innerHTML = 'Configure project Id, API key & URI regex to intercept at <a href="#" id="extensionOptionsLink">extension options</a> first.';

        // Add event listener to the options link
        const optionsLink = document.getElementById('extensionOptionsLink');
        optionsLink.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default anchor behavior
            chrome.runtime.openOptionsPage(); // Open the extension options page
        });

        startButton.style.display = 'none';
        endButton.style.display = 'none';
    } else {
        handleSessionCapture();
    }
    });
});

function clearTrackingIdCookie() {
    try {
        chrome.storage.local.set({ "testchimp.ext-session-record-tracking-id": '' }, function() {
            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError);
                return;
            }
            console.log("TestChimp tracking id cleared via popup");
        });
    } catch (error) {
        console.error("Security error caught:", error);
    }
}

// Initial call to show recent sessions
showRecentSessions();