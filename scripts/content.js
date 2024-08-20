let panel, flashcardContainer, pageContainer;
const PANEL_WIDTH = '30%';
let savedFlashcards = [];
let mode = 'flashcard'; // Define mode variable globally

function createPanel() {
  if (panel) return; // Prevent creating multiple panels

  // Create a container for the original page content
  pageContainer = document.createElement('div');
  pageContainer.id = 'page-container';
  pageContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    transition: width 0.3s ease-in-out;
  `;

  // Move all body contents into the page container
  while (document.body.firstChild) {
    pageContainer.appendChild(document.body.firstChild);
  }
  document.body.appendChild(pageContainer);

  // Create the panel
  panel = document.createElement('div');
  panel.id = 'flashcard-panel';
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${PANEL_WIDTH};
    height: 100%;
    background-color: #ecf0f1;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    overflow-y: auto;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    display: none;
  `;
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
    <div id="language-buttons" style="display: none;">
      <button class="language-btn selected" data-language="English">English</button>
      <button class="language-btn" data-language="French">French</button>
    </div>
    <div id="flashcard-container"></div>
    <button id="generate-btn">Generate</button>
    <div id="collection">
      <button id="add-to-collection-btn">Add to Collection (0)</button>
      <button id="clear-collection-btn">Clear Collection</button>
      <button id="export-csv-btn" style="display: none;">Export CSV</button>
    </div>
  `;
  document.body.appendChild(panel);
  
  flashcardContainer = document.getElementById('flashcard-container');
  
  document.getElementById('close-panel').addEventListener('click', hidePanel);
  document.getElementById('generate-btn').addEventListener('click', generateFlashcards);
  document.getElementById('add-to-collection-btn').addEventListener('click', addToCollection);
  document.getElementById('clear-collection-btn').addEventListener('click', clearCollection);
  document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
  
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modeButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
      mode = button.dataset.mode; // Update mode when a button is clicked
      updateUIForMode(mode);
      updateCollectionButtons();
    });
  });
}

function showPanel() {
  if (!panel) {
    createPanel();
  }
  panel.style.transform = 'translateX(0)';
  pageContainer.style.width = `calc(100% - ${PANEL_WIDTH})`;
  // Ensure the panel is visible
  panel.style.display = 'block';
}

function hidePanel() {
  panel.style.transform = 'translateX(100%)';
  pageContainer.style.width = '100%';
}

function getSelectedText() {
  return window.getSelection().toString().trim();
}

function showLoadingIndicator() {
  const loader = document.createElement('div');
  loader.className = 'loading-indicator';
  document.body.appendChild(loader);
}

function hideLoadingIndicator() {
  const loader = document.querySelector('.loading-indicator');
  if (loader) {
    loader.remove();
  }
}

function generateFlashcards() {
  const selectedText = getSelectedText();
  if (!selectedText) {
    alert('Please select some text first.');
    return;
  }
  
  const mode = document.querySelector('.mode-btn.selected').dataset.mode;
  
  updateUIForMode(mode);
  
  if (mode === 'language') {
    showLanguageModeInstruction();
    return;
  }
  
  showLoadingIndicator();
  
  chrome.runtime.sendMessage({
    action: 'generateFlashcards',
    text: selectedText,
    mode: mode
  }, response => {
    hideLoadingIndicator();
    if (response.success) {
      displayFlashcards(response.flashcards, mode);
    } else {
      alert('Error: ' + response.error);
    }
  });
}

function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  const voices = window.speechSynthesis.getVoices();
  const selectedLanguage = document.querySelector('.language-btn.selected').dataset.language;
  
  if (selectedLanguage === 'French') {
    const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
    if (frenchVoice) utterance.voice = frenchVoice;
  } else {
    const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

function saveFlashcard(flashcard) {
  savedFlashcards.push(flashcard);
  chrome.storage.sync.set({ savedFlashcards }, () => {
    console.log('Flashcard saved');
  });
}

function exportFlashcardsCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Question,Answer\n";
  savedFlashcards.forEach(flashcard => {
    csvContent += `"${flashcard.question}","${flashcard.answer}"\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "flashcards.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

let flashcardCollections = {
  flashcard: [],
  explain: [],
  language: []
};

function displayFlashcards(flashcards, mode) {
  if (!flashcardContainer) {
    console.error('Flashcard container not found');
    return;
  }
  flashcardContainer.innerHTML = '';
  flashcards.forEach(flashcard => {
    const flashcardElement = document.createElement('div');
    flashcardElement.className = 'flashcard';
    flashcardElement.dataset.mode = mode;
    if (mode === 'language') {
      flashcardElement.innerHTML = `
        <div class="word"><b>${flashcard.word}</b>: ${flashcard.translation}</div>
        <div class="example">${flashcard.question}</div>
        <div class="meaning">${flashcard.answer}</div>
      `;
    } else {
      flashcardElement.innerHTML = `
        <div class="question"><strong>Q: ${flashcard.question}</strong></div>
        <div class="answer">A: ${flashcard.answer}</div>
      `;
    }
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', function() {
      flashcardElement.remove();
    });
    flashcardElement.appendChild(removeBtn);
    
    flashcardContainer.appendChild(flashcardElement);
  });
  
  updateCollectionButtons();
}

function addToCollection() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  const flashcards = Array.from(document.querySelectorAll(`.flashcard[data-mode="${currentMode}"]`));
  flashcardCollections[currentMode] = flashcardCollections[currentMode].concat(flashcards.map(fc => {
    return {
      question: fc.querySelector('.question')?.textContent || fc.querySelector('.word')?.textContent,
      answer: fc.querySelector('.answer')?.textContent || fc.querySelector('.meaning')?.textContent
    };
  }));
  updateCollectionButtons();
}

function clearCollection() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  if (confirm(`Are you sure you want to clear the ${currentMode} collection?`)) {
    flashcardCollections[currentMode] = [];
    updateCollectionButtons();
  }
}

function exportCSV() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  const collection = flashcardCollections[currentMode];
  let csvContent = "data:text/csv;charset=utf-8,Question,Answer\n";
  
  collection.forEach(flashcard => {
    let question = flashcard.question.replace(/"/g, '""');
    let answer = flashcard.answer.replace(/"/g, '""');
    csvContent += `"${question}","${answer}"\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${currentMode}_flashcards.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updateCollectionButtons() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  const collectionCount = flashcardCollections[currentMode].length;
  document.getElementById('add-to-collection-btn').textContent = `Add to Collection (${collectionCount})`;
  document.getElementById('export-csv-btn').style.display = collectionCount > 0 ? 'block' : 'none';
}

// Add event listeners for the new buttons
function addEventListeners() {
  document.getElementById('add-to-collection-btn')?.addEventListener('click', addToCollection);
  document.getElementById('clear-collection-btn')?.addEventListener('click', clearCollection);
  document.getElementById('export-csv-btn')?.addEventListener('click', exportCSV);
}

// Call this function after creating the panel
function initializePanel() {
  createPanel();
  addEventListeners();
}

function addHighlight() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const newNode = document.createElement('span');
  newNode.classList.add('extension-highlight');
  newNode.style.backgroundColor = 'yellow';
  
  try {
    range.surroundContents(newNode);
  } catch (e) {
    console.error('Failed to highlight:', e);
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedShowPanel = debounce(() => {
  if (getSelectedText()) {
    showPanel();
  }
}, 300);

function lazyLoadPanelContent() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const lazyElement = entry.target;
        if (lazyElement.dataset.src) {
          lazyElement.src = lazyElement.dataset.src;
          lazyElement.removeAttribute('data-src');
        }
        observer.unobserve(lazyElement);
      }
    });
  });

  document.querySelectorAll('#flashcard-panel .lazy-load').forEach(img => {
    observer.observe(img);
  });
}

// Event Listeners
document.addEventListener('mouseup', (e) => {
  if (e.altKey && getSelectedText()) {
    addHighlight();
  } else {
    const selectedText = getSelectedText();
    if (selectedText) {
      if (!panel) {
        createPanel();
      }
      showPanel();
    }
  }
});

document.addEventListener('dblclick', (e) => {
  if (mode === 'language') {
    const selectedText = getSelectedText();
    if (selectedText && selectedText.length < 20) {
      speakWord(selectedText);
      handleLanguageModeSelection(e);
    }
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showPanel") {
    showPanel();
  }
});

// Add event listeners for language buttons
function updateUIForMode(mode) {
  const generateBtn = document.getElementById('generate-btn');
  const languageButtons = document.getElementById('language-buttons');
  
  if (mode === 'language') {
    generateBtn.style.display = 'none';
    languageButtons.style.display = 'flex';
  } else {
    generateBtn.style.display = 'block';
    languageButtons.style.display = 'none';
  }
}

function addLanguageButtonListeners() {
  const languageButtons = document.querySelectorAll('.language-btn');
  languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      languageButtons.forEach(btn => btn.classList.remove('selected'));
      button.classList.add('selected');
    });
  });
}

// Call this function after creating the panel
function initializePanel() {
  createPanel();
  addEventListeners();
  addLanguageButtonListeners();
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializePanel();
    chrome.storage.sync.get('savedFlashcards', result => {
      if (result.savedFlashcards) {
        savedFlashcards = result.savedFlashcards;
      }
    });
  } catch (error) {
    console.error('Error initializing Flashcard Generator:', error);
  }
});

// Call this function after panel content is loaded
lazyLoadPanelContent();
function showLanguageModeInstruction() {
  const instruction = document.createElement('div');
  instruction.id = 'language-mode-instruction';
  instruction.textContent = 'Choose a language and double-click on a word to translate';
  instruction.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #f0f0f0;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
  `;
  document.body.appendChild(instruction);
  setTimeout(() => {
    instruction.remove();
  }, 5000);
}

function handleLanguageModeSelection(event) {
  if (mode !== 'language') return;

  const selection = window.getSelection();
  const word = selection.toString().trim();

  if (word && word.length < 20) {
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = 'yellow';
    span.textContent = word;
    range.deleteContents();
    range.insertNode(span);

    const selectedLanguageButton = document.querySelector('#language-buttons .mode-btn.selected');
    if (selectedLanguageButton) {
      const targetLanguage = selectedLanguageButton.dataset.language;
      const phrase = getPhrase(range, word);
      generateLanguageFlashcard(word, phrase, targetLanguage);
    } else {
      console.error('No language selected');
    }
  }
}

document.addEventListener('dblclick', handleLanguageModeSelection);
