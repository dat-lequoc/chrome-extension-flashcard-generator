let panel, flashcardContainer;

function createPanel() {
  panel = document.createElement('div');
  panel.id = 'flashcard-panel';
  panel.innerHTML = `
    <div id="panel-header">
      <h2>Flashcard Generator</h2>
      <button id="close-panel">×</button>
    </div>
    <div id="mode-selector">
      <button class="mode-btn selected" data-mode="flashcard">Flashcard</button>
      <button class="mode-btn" data-mode="explain">Explain</button>
      <button class="mode-btn" data-mode="language">Language</button>
    </div>
    <div id="flashcard-container"></div>
    <button id="generate-btn">Generate</button>
  `;
  document.body.appendChild(panel);
  
  flashcardContainer = document.getElementById('flashcard-container');
  
  document.getElementById('close-panel').addEventListener('click', () => {
    panel.style.display = 'none';
  });
  
  document.getElementById('generate-btn').addEventListener('click', generateFlashcards);
  
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modeButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
    });
  });
}

function showPanel() {
  if (!panel) {
    createPanel();
  }
  panel.style.display = 'block';
}

function getSelectedText() {
  return window.getSelection().toString().trim();
}

function generateFlashcards() {
  const selectedText = getSelectedText();
  if (!selectedText) {
    alert('Please select some text first.');
    return;
  }
  
  const mode = document.querySelector('.mode-btn.selected').dataset.mode;
  
  chrome.runtime.sendMessage({
    action: 'generateFlashcards',
    text: selectedText,
    mode: mode
  }, response => {
    if (response.error) {
      alert('Error: ' + response.error);
    } else {
      displayFlashcards(response.flashcards, mode);
    }
  });
}

function displayFlashcards(flashcards, mode) {
  flashcardContainer.innerHTML = '';
  flashcards.forEach(flashcard => {
    const flashcardElement = document.createElement('div');
    flashcardElement.className = 'flashcard';
    if (mode === 'language') {
      flashcardElement.innerHTML = `
        <div class="word">${flashcard.word}</div>
        <div class="translation">${flashcard.translation}</div>
        <div class="example">${flashcard.question}</div>
        <div class="meaning">${flashcard.answer}</div>
      `;
    } else {
      flashcardElement.innerHTML = `
        <div class="question">${flashcard.question}</div>
        <div class="answer">${flashcard.answer}</div>
      `;
    }
    flashcardContainer.appendChild(flashcardElement);
  });
}

document.addEventListener('mouseup', () => {
  if (getSelectedText()) {
    showPanel();
  }
});

// Initial setup
createPanel();
