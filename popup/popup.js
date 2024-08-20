document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveButton = document.getElementById('save-api-key');

  // Load saved API key
  chrome.storage.sync.get('apiKey', result => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ apiKey }, () => {
        alert('API key saved successfully!');
      });
    } else {
      alert('Please enter a valid API key.');
    }
  });
});
