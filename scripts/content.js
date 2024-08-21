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
      <!-- Language buttons will be dynamically populated based on settings -->
    </div>
    <button id="generate-btn" style="font-size: 14px; padding: 5px 10px; margin-top: 10px; margin-bottom: 10px;">Generate</button>
    <div id="flashcard-container" style="font-size: 14px;"></div>
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

  // Create a guide for Language mode
  const languageButtons = document.getElementById('language-buttons');
  const guide = document.createElement('p');
  guide.id = 'language-mode-guide';
  guide.textContent = 'Double-click on a word to translate';
  guide.style.cssText = 'font-size: 14px; margin: 10px 0; text-align: center;';
  languageButtons.appendChild(guide);
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
  
  showGeneratingNotification();
  
  let context = '';
  if (mode === 'language') {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    context = getPhrase(range, selectedText);
  }
  
  chrome.runtime.sendMessage({
    action: 'generateFlashcards',
    text: selectedText,
    mode: mode,
    context: context
  }, response => {
    hideGeneratingNotification();
    if (response.success) {
      displayFlashcards(response.flashcards, mode);
    } else {
      alert('Error: ' + response.error);
    }
  });
}

function showGeneratingNotification() {
  const notification = document.createElement('div');
  notification.id = 'generating-notification';
  notification.textContent = 'Generating...';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(76, 175, 80, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10001;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    hideGeneratingNotification();
  }, 3000);
}

function hideGeneratingNotification() {
  const notification = document.getElementById('generating-notification');
  if (notification) {
    notification.remove();
  }
}

function speakWord(word) {
  console.log('speakword');
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);

  chrome.storage.sync.get('targetLanguage', (result) => {
    const targetLanguage = result.targetLanguage || 'English';

    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      const languageVoice = voices.find(voice => voice.lang.startsWith(targetLanguage.toLowerCase().slice(0, 2)));

      if (languageVoice) utterance.voice = languageVoice;

      window.speechSynthesis.speak(utterance);
    };

    // Trigger onvoiceschanged if voices are already loaded
    if (window.speechSynthesis.getVoices().length > 0) {
      window.speechSynthesis.onvoiceschanged();
    }
  });
}

function saveFlashcard(flashcard) {
  savedFlashcards.push(flashcard);
  chrome.storage.sync.set({ savedFlashcards }, () => {
    console.log('Flashcard saved');
  });
}

function displayFlashcards(flashcards, mode) {
  if (!flashcardContainer) {
    console.error('Flashcard container not found');
    return;
  }
  const existingFlashcards = Array.from(flashcardContainer.children);
  flashcards.forEach(flashcard => {
    const flashcardElement = document.createElement('div');
    flashcardElement.className = 'flashcard';
    flashcardElement.dataset.mode = mode;
    if (mode === 'language') {
      flashcardElement.innerHTML = `
        <div class="translation" style="font-size: 1.2em;">${flashcard.word}: <b>${flashcard.translation}</b></div>
        <div class="question" style="display: none;">${flashcard.question}</div>
        <div class="answer"><i>• ${flashcard.answer}</i></div>
      `;
    } else {
      flashcardElement.innerHTML = `
        <div class="question"><strong>Q: ${flashcard.question}</strong></div>
        <div class="answer"><strong>A:</strong> ${flashcard.answer}</div>
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
    
    flashcardContainer.insertBefore(flashcardElement, flashcardContainer.firstChild);
  });
  
  // Append existing flashcards after the new ones
  existingFlashcards.forEach(existingFlashcard => {
    flashcardContainer.appendChild(existingFlashcard);
  });
  
  updateCollectionButtons();
}

function addToCollection() {
  const currentMode = document.querySelector('.mode-btn.selected').dataset.mode;
  const flashcards = Array.from(document.querySelectorAll(`.flashcard[data-mode="${currentMode}"]`));
  const newFlashcards = flashcards.map(fc => {
    if (currentMode === 'language') {
      const result = {
        translation: fc.querySelector('.translation')?.textContent.trim(),
        question: fc.querySelector('.question')?.textContent.trim().slice(2),
        answer: fc.querySelector('.answer')?.textContent.trim().slice(2),
      };
      console.log(result);
      return result;
    } else {
      return {
        question: fc.querySelector('.question')?.textContent.trim().replace(/^Q:\s*/, ''),
        answer: fc.querySelector('.answer')?.textContent.trim().replace(/^A:\s*/, ''),
      };
    }
  });
  
  chrome.runtime.sendMessage({
    action: 'getCollection',
    mode: currentMode
  }, response => {
    const existingCollection = response.collection || [];
    const updatedCollection = [...existingCollection, ...newFlashcards];
    
    chrome.runtime.sendMessage({
      action: 'updateCollection',
      mode: currentMode,
      flashcards: updatedCollection
    }, () => {
      updateCollectionButtons();
      // Remove all current flashcards from display
      flashcards.forEach(fc => fc.remove());
    });
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
      collection.forEach(flashcard => {
        csvContent += `"${flashcard.question}";"• ${flashcard.translation}"<br>"• ${flashcard.answer}"`
      });
    } else {
      collection.forEach(flashcard => {
        csvContent += `"${flashcard.question}";"${flashcard.answer}"\n`;
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
  console.log("updateColl: ", flashcards);
  const newFlashcards = flashcards.map(fc => {
    if (currentMode === 'language') {
      return {
        word: fc.dataset.word,
        translation: fc.querySelector('.translation')?.textContent.trim(),
        question: fc.querySelector('.question')?.textContent.trim().slice(2),
        answer: fc.querySelector('.answer')?.textContent.trim().slice(2),
      };
    } else {
      return {
        question: fc.querySelector('.question')?.textContent.trim().replace(/^Q:\s*/, ''),
        answer: fc.querySelector('.answer')?.textContent.trim().replace(/^A:\s*/, ''),
      };
    }
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

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showPanel") {
    initializeExtension();
  }
});

function initializeExtension() {
  if (!panel) {
    createPanel();
  }
  showPanel();
  addEventListeners();
}

function addEventListeners() {
  document.addEventListener('mouseup', (e) => {
    if (e.altKey && getSelectedText()) {
      addHighlight();
    } else {
      const selectedText = getSelectedText();
      if (selectedText) {
        chrome.storage.sync.get('autoPopup', (result) => {
          if (result.autoPopup !== false) {
            showPanel();
          }
        });
      }
    }
  });

  // Debounce function
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

  const debouncedHandleLanguageModeSelection = debounce(async (e) => {
    if (mode === 'language') {
      const selectedText = getSelectedText();
      if (selectedText && selectedText.length < 20) {
        await handleLanguageModeSelection(e);
      }
    }
  }, 300);

  document.addEventListener('dblclick', debouncedHandleLanguageModeSelection);
}

// Add event listeners for language buttons
function updateUIForMode(mode) {
  const generateBtn = document.getElementById('generate-btn');
  const languageModeGuide = document.getElementById('language-mode-guide');
  
  if (mode === 'language') {
    generateBtn.style.display = 'none';
    languageModeGuide.style.display = 'block';
  } else {
    generateBtn.style.display = 'block';
    languageModeGuide.style.display = 'none';
  }
}

// Initial setup
function setupExtension() {
  if (chrome.runtime && chrome.runtime.id) {
    try {
      initializePanel();
      chrome.storage.sync.get('savedFlashcards', result => {
        if (result.savedFlashcards) {
          savedFlashcards = result.savedFlashcards;
        }
      });
      // Call this function after panel content is loaded
      lazyLoadPanelContent();
    } catch (error) {
      console.error('Error initializing Flashcard Generator:', error);
    }
  } else {
    console.warn('Extension context is invalid. Retrying in 1 second...');
    setTimeout(setupExtension, 1000);
  }
}

// Use 'load' event instead of 'DOMContentLoaded' for more reliability
window.addEventListener('load', setupExtension);
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
    console.log("generateL:",response);
    if (response.success) {
      displayFlashcards(response.flashcards, 'language');
    } else {
      alert('Error: ' + response.error);
    }
  });
}

let lastProcessedWord = '';
let processingWord = false;

async function handleLanguageModeSelection(event) {
  if (mode !== 'language' || processingWord) return;

  const selection = window.getSelection();
  const word = selection.toString().trim();

  if (word && word.length < 20 && word !== lastProcessedWord) {
    processingWord = true;
    lastProcessedWord = word;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = 'yellow';
    span.textContent = word + ' ';
    range.deleteContents();
    range.insertNode(span);

    showGeneratingNotification();

    try {
      const result = await new Promise((resolve) => chrome.storage.sync.get('targetLanguage', resolve));
      const targetLanguage = result.targetLanguage || 'English';
      const phrase = getPhrase(range, word);
      console.log("handleLang:", word, phrase, targetLanguage);
      speakWord(word);
      await generateLanguageFlashcard(word, phrase, targetLanguage);
    } catch (error) {
      console.error('Error in handleLanguageModeSelection:', error);
    } finally {
      processingWord = false;
      hideGeneratingNotification();
    }
  }
}

// Event listener is now handled in the initialization code above

// Modify the generateLanguageFlashcard function to return a promise
function generateLanguageFlashcard(word, phrase, targetLanguage) {
  showLoadingIndicator();
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'generateFlashcards',
      text: word,
      context: phrase,
      mode: 'language',
      targetLanguage: targetLanguage
    }, response => {
      hideLoadingIndicator();
      console.log("generateLangluage:", response);
      if (response.success) {
        displayFlashcards(response.flashcards, 'language');
        resolve();
      } else {
        console.error('Error generating flashcard:', response.error);
        const errorMessage = response.error === 'Failed to fetch' 
          ? 'Network error. Right Click => This can read ... => On all sites'
          : `Error: ${response.error}`;
        showErrorNotification(errorMessage);
        reject(new Error(response.error));
      }
    });
  });
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.id = 'error-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #ff4444;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10001;
    max-width: 80%;
    text-align: center;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 5000);
}
