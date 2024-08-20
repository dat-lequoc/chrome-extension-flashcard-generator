document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const systemPromptTextarea = document.getElementById('system-prompt');

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'model', 'systemPrompt'], (result) => {
    apiKeyInput.value = result.apiKey || '';
    modelSelect.value = result.model || 'claude-3-5-sonnet-20240620';
    systemPromptTextarea.value = result.systemPrompt || 'Generate concise flashcards based on the following text. Create 3-5 flashcards, each with a question (Q:) and an answer (A:). The questions should test key concepts, and the answers should be brief but complete.';
  });

  // Save settings
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.sync.set({
      apiKey: apiKeyInput.value,
      model: modelSelect.value,
      systemPrompt: systemPromptTextarea.value
    }, () => {
      alert('Settings saved successfully!');
    });
  });
});
