document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const flashcardPromptTextarea = document.getElementById('flashcard-prompt');
  const explainPromptTextarea = document.getElementById('explain-prompt');
  const languagePromptTextarea = document.getElementById('language-prompt');
  const autoPopupCheckbox = document.getElementById('auto-popup');
  const translationLanguageSelect = document.getElementById('translation-language');
  const targetLanguageSelect = document.getElementById('target-language');

  // Load saved settings
  // Load default prompts from files
  Promise.all([
    fetch(chrome.runtime.getURL('prompts/flashcard_prompt.txt')).then(response => response.text()),
    fetch(chrome.runtime.getURL('prompts/explain_prompt.txt')).then(response => response.text()),
    fetch(chrome.runtime.getURL('prompts/language_prompt.txt')).then(response => response.text())
  ]).then(([defaultFlashcardPrompt, defaultExplainPrompt, defaultLanguagePrompt]) => {
    chrome.storage.sync.get(['apiKey', 'model', 'flashcardPrompt', 'explainPrompt', 'languagePrompt', 'autoPopup', 'translationLanguage', 'targetLanguage'], (result) => {
      apiKeyInput.value = result.apiKey || '';
      modelSelect.value = result.model || 'claude-3-5-sonnet-20240620';
      flashcardPromptTextarea.value = result.flashcardPrompt || defaultFlashcardPrompt.trim();
      explainPromptTextarea.value = result.explainPrompt || defaultExplainPrompt.trim();
      languagePromptTextarea.value = result.languagePrompt || defaultLanguagePrompt.trim();
      autoPopupCheckbox.checked = result.autoPopup !== false;
      translationLanguageSelect.value = result.translationLanguage || 'Vietnamese';
      targetLanguageSelect.value = result.targetLanguage || 'English';
    });
  });

  // Save settings
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.sync.set({
      apiKey: apiKeyInput.value,
      model: modelSelect.value,
      flashcardPrompt: flashcardPromptTextarea.value,
      explainPrompt: explainPromptTextarea.value,
      languagePrompt: languagePromptTextarea.value,
      autoPopup: autoPopupCheckbox.checked,
      translationLanguage: translationLanguageSelect.value,
      targetLanguage: targetLanguageSelect.value
    }, () => {
      alert('Settings saved successfully!');
    });
  });

  // Add event listener for the reset button
  document.getElementById('reset-defaults').addEventListener('click', resetToDefaults);
});

function resetToDefaults() {
  if (confirm('Are you sure you want to reset all settings to their default values?')) {
    // Load default prompts from files
    Promise.all([
      fetch(chrome.runtime.getURL('prompts/flashcard_prompt.txt')).then(response => response.text()),
      fetch(chrome.runtime.getURL('prompts/explain_prompt.txt')).then(response => response.text()),
      fetch(chrome.runtime.getURL('prompts/language_prompt.txt')).then(response => response.text())
    ]).then(([defaultFlashcardPrompt, defaultExplainPrompt, defaultLanguagePrompt]) => {
      // Update form fields with default values
      apiKeyInput.value = '';
      modelSelect.value = 'claude-3-5-sonnet-20240620';
      flashcardPromptTextarea.value = defaultFlashcardPrompt.trim();
      explainPromptTextarea.value = defaultExplainPrompt.trim();
      languagePromptTextarea.value = defaultLanguagePrompt.trim();
      autoPopupCheckbox.checked = true;
      translationLanguageSelect.value = 'Vietnamese';
      targetLanguageSelect.value = 'English';

      // Trigger the form submission to save these values
      document.getElementById('settings-form').dispatchEvent(new Event('submit'));
    });
  }
}
