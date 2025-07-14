document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('configForm');
  const saveButton = document.getElementById('saveButton');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // Load saved settings and populate the form
  chrome.storage.sync.get([
    'projectId',
    'sessionRecordingApiKey',
    'endpoint',
    'maxSessionDurationSecs',
    'uriRegexToIntercept',
    'excludedUriRegexList',
    'currentUserId',
    'enableRunLocallyForTcRuns',
    'userAuthKey',
    'vscodeWebsocketPort',
    'mcpWebsocketPort',
  ], function (items) {
    form.projectId.value = items.projectId || '';
    form.sessionRecordingApiKey.value = items.sessionRecordingApiKey || '';
    form.endpoint.value = items.endpoint || '';
    form.maxSessionDurationSecs.value = items.maxSessionDurationSecs || '';
    form.uriRegexToIntercept.value = items.uriRegexToIntercept || '';
    form.excludedUriRegexList.value = items.excludedUriRegexList || '';
    form.currentUserId.value = items.currentUserId || '';
    form.userAuthKey.value = items.userAuthKey || '';
    form.enableRunLocally.checked = items.enableRunLocallyForTcRuns;
    form.vscodeWebsocketPort.value = items.vscodeWebsocketPort || 53333;
    form.mcpWebsocketPort.value = items.mcpWebsocketPort || 43449;
  });

  // Save settings with validation
  saveButton.addEventListener('click', function () {
    const userAuthKey = form.userAuthKey.value.trim();
    const currentUserId = form.currentUserId.value.trim();

    // Validate required fields
    if (!userAuthKey || !currentUserId) {
      alert('Error: Please fill in all required fields: User auth key and current user id.');
      return;
    }

    chrome.storage.sync.set({
      projectId: form.projectId.value.trim(),
      sessionRecordingApiKey: form.sessionRecordingApiKey.value.trim(),
      endpoint: form.endpoint.value.trim(),
      samplingProbabilityOnError: 0.0,
      samplingProbability: 1.0,
      maxSessionDurationSecs: form.maxSessionDurationSecs.value.trim(),
      eventWindowToSaveOnError: 200,
      uriRegexToIntercept: form.uriRegexToIntercept.value.trim(),
      excludedUriRegexList: form.excludedUriRegexList.value.trim(),
      currentUserId: currentUserId,
      userAuthKey: userAuthKey,
      enableRunLocallyForTcRuns: form.enableRunLocally.checked,
      vscodeWebsocketPort: Number(form.vscodeWebsocketPort.value) || 53333,
      mcpWebsocketPort: Number(form.mcpWebsocketPort.value) || 43449,
    }, function () {
      alert('Settings saved');
    });
  });

  // Tab handling
  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetTab = this.getAttribute('data-target');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));

      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
});