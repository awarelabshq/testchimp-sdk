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

  // Save settings
  saveButton.addEventListener('click', function() {
    chrome.storage.sync.set({
      projectId: form.projectId.value,
      sessionRecordingApiKey: form.sessionRecordingApiKey.value,
      endpoint: form.endpoint.value,
      samplingProbabilityOnError: 0.0,
      samplingProbability: 1.0,
      maxSessionDurationSecs: form.maxSessionDurationSecs.value,
      eventWindowToSaveOnError: 200,
      uriRegexToIntercept: form.uriRegexToIntercept.value,
      currentUserId: form.currentUserId.value
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