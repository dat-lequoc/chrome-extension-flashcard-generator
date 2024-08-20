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
    <button id="close-panel" style="position: absolute; top: 5px; right: 5px; font-size: 16px;">×</button>
    <div id="mode-selector" style="margin-top: 20px;">
      <button class="mode-btn selected" data-mode="flashcard" style="font-size: 14px; padding: 5px 10px; cursor: pointer;">Flashcard</button>
      <button class="mode-btn" data-mode="explain" style="font-size: 14px; padding: 5px 10px; cursor: pointer;">Explain</button>
      <button class="mode-btn" data-mode="language" style="font-size: 14px; padding: 5px 10px; cursor: pointer;">Language</button>
    </div>
    <div id="language-buttons" style="display: none; margin-top: 10px;">
      <button class="mode-btn language-btn selected" data-language="English" style="font-size: 14px; padding: 5px 10px; cursor: pointer; margin-right: 5px;">English</button>
      <button class="mode-btn language-btn" data-language="French" style="font-size: 14px; padding: 5px 10px; cursor: pointer;">French</button>
    </div>
    <div id="flashcard-container" style="font-size: 14px;"></div>
    <button id="generate-btn" style="font-size: 14px; padding: 5px 10px; margin-top: 10px;">Generate</button>
    <div id="collection" style="margin-top: 10px;">
      <button id="add-to-collection-btn" style="font-size: 14px; padding: 5px 10px;">Add to Collection (0)</button>
      <button id="clear-collection-btn" style="font-size: 14px; padding: 5px 10px;">Clear Collection</button>
      <button id="export-csv-btn" style="display: none; font-size: 14px; padding: 5px 10px;">Export CSV</button>
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
      updateCollection();
    });
    flashcardElement.appendChild(removeBtn);
    
    flashcardContainer.appendChild(flashcardElement);
  });
  
  updateCollectionButtons();
}

function addToCollection() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  const flashcards = Array.from(document.querySelectorAll(`.flashcard[data-mode="${currentMode}"]`));
  const newFlashcards = flashcards.map(fc => {
    return {
      question: fc.querySelector('.question')?.textContent || fc.querySelector('.word')?.textContent,
      answer: fc.querySelector('.answer')?.textContent || fc.querySelector('.meaning')?.textContent
    };
  });
  
  chrome.runtime.sendMessage({
    action: 'updateCollection',
    mode: currentMode,
    flashcards: newFlashcards
  }, () => {
    updateCollectionButtons();
  });
}

function clearCollection() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  if (confirm(`Are you sure you want to clear the ${currentMode} collection?`)) {
    chrome.runtime.sendMessage({
      action: 'clearCollection',
      mode: currentMode
    }, () => {
      updateCollectionButtons();
    });
  }
}

function exportCSV() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  chrome.runtime.sendMessage({
    action: 'getCollection',
    mode: currentMode
  }, response => {
    const collection = response.collection;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (currentMode === 'language') {
      csvContent += "Word/Phrase,Translation,Example,Meaning\n";
      collection.forEach(flashcard => {
        const word = flashcard.question.split(':')[0].trim();
        const translation = flashcard.question.split(':')[1].trim();
        const example = flashcard.answer.split('\n')[0].trim();
        const meaning = flashcard.answer.split('\n')[1].trim();
        csvContent += `"${word}","${translation}","${example}","${meaning}"\n`;
      });
    } else {
      csvContent += "Question,Answer\n";
      collection.forEach(flashcard => {
        const question = flashcard.question.replace(/^Q:\s*/, '').replace(/"/g, '""');
        const answer = flashcard.answer.replace(/^A:\s*/, '').replace(/"/g, '""');
        csvContent += `"${question}","${answer}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentMode}_flashcards.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

function updateCollectionButtons() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  chrome.runtime.sendMessage({
    action: 'getCollection',
    mode: currentMode
  }, response => {
    const collectionCount = response.collection.length;
    document.getElementById('add-to-collection-btn').textContent = `Add to Collection (${collectionCount})`;
    document.getElementById('export-csv-btn').style.display = collectionCount > 0 ? 'block' : 'none';
  });
}

function updateCollection() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  const flashcards = Array.from(document.querySelectorAll(`.flashcard[data-mode="${currentMode}"]`));
  const newFlashcards = flashcards.map(fc => {
    return {
      question: fc.querySelector('.question')?.textContent || fc.querySelector('.word')?.textContent,
      answer: fc.querySelector('.answer')?.textContent || fc.querySelector('.meaning')?.textContent
    };
  });
  
  chrome.runtime.sendMessage({
    action: 'updateCollection',
    mode: currentMode,
    flashcards: newFlashcards
  }, () => {
    updateCollectionButtons();
  });
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
      chrome.storage.sync.get('autoPopup', (result) => {
        if (result.autoPopup !== false) {
          if (!panel) {
            createPanel();
          }
          showPanel();
        }
      });
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
    languageButtons.style.pointerEvents = 'auto';
  } else {
    generateBtn.style.display = 'block';
    languageButtons.style.display = 'none';
  }

  // Ensure a language is selected
  const selectedLanguageBtn = languageButtons.querySelector('.selected');
  if (!selectedLanguageBtn && mode === 'language') {
    const defaultLanguageBtn = languageButtons.querySelector('[data-language="English"]');
    if (defaultLanguageBtn) {
      defaultLanguageBtn.classList.add('selected');
    }
  }
}

function addLanguageButtonListeners() {
  const languageButtonsContainer = document.getElementById('language-buttons');
  languageButtonsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('language-btn')) {
      const languageButtons = languageButtonsContainer.querySelectorAll('.language-btn');
      languageButtons.forEach(btn => btn.classList.remove('selected'));
      e.target.classList.add('selected');
      // Don't change the mode, just update UI
      updateUIForMode(mode);
    }
  });
}

// Call this function after creating the panel
function initializePanel() {
  createPanel();
  addEventListeners();
  addLanguageButtonListeners();
  // Set English as default language
  const englishButton = document.querySelector('.language-btn[data-language="English"]');
  if (englishButton) {
    englishButton.classList.add('selected');
  }
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

function getPhrase(range, word) {
  const sentenceStart = /[.!?]\s+[A-Z]|^[A-Z]/;
  const sentenceEnd = /[.!?](?=\s|$)/;

  let startNode = range.startContainer;
  let endNode = range.endContainer;
  let startOffset = Math.max(0, range.startOffset - 50);
  let endOffset = Math.min(endNode.length, range.endOffset + 50);

  // Expand to sentence boundaries
  while (startNode && startNode.textContent && !sentenceStart.test(startNode.textContent.slice(0, startOffset))) {
    if (startNode.previousSibling) {
      startNode = startNode.previousSibling;
      startOffset = startNode.textContent ? startNode.textContent.length : 0;
    } else if (startNode.parentNode && startNode.parentNode.previousSibling) {
      startNode = startNode.parentNode.previousSibling.lastChild;
      startOffset = startNode && startNode.textContent ? startNode.textContent.length : 0;
    } else {
      break;
    }
  }

  while (endNode && endNode.textContent && !sentenceEnd.test(endNode.textContent.slice(endOffset))) {
    if (endNode.nextSibling) {
      endNode = endNode.nextSibling;
      endOffset = 0;
    } else if (endNode.parentNode && endNode.parentNode.nextSibling) {
      endNode = endNode.parentNode.nextSibling.firstChild;
      endOffset = 0;
    } else {
      break;
    }
  }

  // Extract the phrase
  let phrase = '';
  let currentNode = startNode;
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const text = currentNode.textContent;
      const start = currentNode === startNode ? startOffset : 0;
      const end = currentNode === endNode ? endOffset : text.length;
      phrase += text.slice(start, end);
    }
    if (currentNode === endNode) break;
    currentNode = currentNode.nextSibling;
  }

  // Ensure the word is bolded in the phrase
  const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
  phrase = phrase.replace(wordRegex, `<b>$&</b>`);

  return phrase.trim();
}

function generateLanguageFlashcard(word, phrase, targetLanguage) {
  showLoadingIndicator();
  
  chrome.runtime.sendMessage({
    action: 'generateFlashcards',
    text: word,
    context: phrase,
    mode: 'language',
    targetLanguage: targetLanguage
  }, response => {
    hideLoadingIndicator();
    if (response.success) {
      displayFlashcards(response.flashcards, 'language');
    } else {
      alert('Error: ' + response.error);
    }
  });
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
