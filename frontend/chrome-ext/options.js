document.addEventListener('DOMContentLoaded', function() {
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
    'currentUserId'
  ], function(items) {
    form.projectId.value = items.projectId || '';
    form.sessionRecordingApiKey.value = items.sessionRecordingApiKey || '';
    form.endpoint.value = items.endpoint || '';
    form.maxSessionDurationSecs.value = items.maxSessionDurationSecs || '';
    form.uriRegexToIntercept.value = items.uriRegexToIntercept || '';
    form.currentUserId.value = items.currentUserId || '';
  });

  // Save settings with validation
  saveButton.addEventListener('click', function() {
    const projectId = form.projectId.value.trim();
    const sessionRecordingApiKey = form.sessionRecordingApiKey.value.trim();
    const uriRegexToIntercept = form.uriRegexToIntercept.value.trim();

    // Validate required fields
    if (!projectId || !sessionRecordingApiKey || !uriRegexToIntercept) {
      alert('Error: Please fill in all required fields: Project ID, Session Recording API Key, and URI Regex to Intercept.');
      return;
    }

    chrome.storage.sync.set({
      projectId: projectId,
      sessionRecordingApiKey: sessionRecordingApiKey,
      endpoint: form.endpoint.value.trim(),
      samplingProbabilityOnError: 0.0,
      samplingProbability: 1.0,
      maxSessionDurationSecs: form.maxSessionDurationSecs.value.trim(),
      eventWindowToSaveOnError: 200,
      uriRegexToIntercept: uriRegexToIntercept,
      currentUserId: form.currentUserId.value.trim()
    }, function() {
      alert('Settings saved');
    });
  });

  // Tab handling
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-target');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));

      this.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
});