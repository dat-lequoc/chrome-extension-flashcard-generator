document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const flashcardPromptTextarea = document.getElementById('flashcard-prompt');
  const explainPromptTextarea = document.getElementById('explain-prompt');
  const languagePromptTextarea = document.getElementById('language-prompt');

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'model', 'flashcardPrompt', 'explainPrompt', 'languagePrompt'], (result) => {
    apiKeyInput.value = result.apiKey || '';
    modelSelect.value = result.model || 'claude-3-5-sonnet-20240620';
    flashcardPromptTextarea.value = result.flashcardPrompt || 'Generate concise flashcards based on the following text. Create 3-5 flashcards, each with a question (Q:) and an answer (A:). The questions should test key concepts, and the answers should be brief but complete.';
    explainPromptTextarea.value = result.explainPrompt || 'Explain the following text in simple terms, focusing on the main concepts and their relationships. Use clear and concise language, and break down complex ideas into easily understandable parts.';
    languagePromptTextarea.value = result.languagePrompt || 'For the following text, identify key terms or phrases and provide their definitions and usage examples. Format each entry as follows:\nWord: [term]\nTranslation: [brief translation or equivalent]\nExample: [example sentence using the term]\nMeaning: [concise explanation]';
  });

  // Save settings
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.sync.set({
      apiKey: apiKeyInput.value,
      model: modelSelect.value,
      flashcardPrompt: flashcardPromptTextarea.value,
      explainPrompt: explainPromptTextarea.value,
      languagePrompt: languagePromptTextarea.value
    }, () => {
      alert('Settings saved successfully!');
    });
  });
});
