document.addEventListener('DOMContentLoaded', () => {
  const openFlashcardPanelBtn = document.getElementById('open-flashcard-panel');
  const openSettingsBtn = document.getElementById('open-settings');

  openFlashcardPanelBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "showPanel"});
    });
  });

  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
