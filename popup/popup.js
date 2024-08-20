document.addEventListener('DOMContentLoaded', () => {
  const openFlashcardPanelBtn = document.getElementById('open-flashcard-panel');

  openFlashcardPanelBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "openFlashcardPanel"});
    });
  });
});
