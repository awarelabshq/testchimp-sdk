document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('configForm');
  const saveButton = document.getElementById('saveButton');
  const saveToast = document.getElementById('saveToast');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  let toastTimer;

  function showToast(message, isError) {
    clearTimeout(toastTimer);
    saveToast.textContent = message;
    saveToast.style.borderColor = isError ? 'rgba(255, 77, 79, 0.5)' : '';
    saveToast.classList.add('visible');
    toastTimer = setTimeout(() => saveToast.classList.remove('visible'), 2500);
  }

  chrome.storage.sync.get([
    'projectId',
    'currentUserId',
    'userAuthKey',
  ], function (items) {
    form.projectId.value = items.projectId || '';
    form.currentUserId.value = items.currentUserId || '';
    form.userAuthKey.value = items.userAuthKey || '';
  });

  saveButton.addEventListener('click', function () {
    const userAuthKey = form.userAuthKey.value.trim();
    const currentUserId = form.currentUserId.value.trim();

    if (!userAuthKey || !currentUserId) {
      showToast('Please fill in your email and authentication key.', true);
      return;
    }

    chrome.storage.sync.set({
      projectId: form.projectId.value.trim(),
      currentUserId: currentUserId,
      userAuthKey: userAuthKey,
    }, function () {
      showToast('Settings saved');
    });
  });

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
