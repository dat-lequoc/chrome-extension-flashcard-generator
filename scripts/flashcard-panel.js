// Flashcard panel functionality
let mode = 'flashcard';
let selectedLanguage = 'English';
let flashcardCollection = [];
let languageCollection = [];

function initializeFlashcardPanel() {
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model-select');
  const systemPrompt = document.getElementById('system-prompt');
  const explainPrompt = document.getElementById('explain-prompt');
  const languagePrompt = document.getElementById('language-prompt');
  const modeToggle = document.getElementById('mode-toggle');
  const languageButtons = document.getElementById('language-buttons');
  const generateBtn = document.getElementById('generate-btn');
  const flashcardsContainer = document.getElementById('flashcards');
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';
  
  const topButtonContainer = document.createElement('div');
  topButtonContainer.className = 'top-button-container';
  
  const addToCollectionBtn = document.createElement('button');
  addToCollectionBtn.id = 'add-to-collection-btn';
  addToCollectionBtn.textContent = 'Add to Collection (0)';
  
  const clearCollectionBtn = document.createElement('button');
  clearCollectionBtn.id = 'clear-collection-btn';
  clearCollectionBtn.textContent = 'Clear Collection';
  
  const exportCsvBtn = document.createElement('button');
  exportCsvBtn.id = 'export-csv-btn';
  exportCsvBtn.textContent = 'Export CSV';
  
  topButtonContainer.appendChild(addToCollectionBtn);
  topButtonContainer.appendChild(clearCollectionBtn);
  
  buttonContainer.appendChild(topButtonContainer);
  buttonContainer.appendChild(exportCsvBtn);
  
  document.getElementById('flashcard-panel').appendChild(buttonContainer);

  // Load saved data
  chrome.storage.sync.get(['apiKey', 'selectedModel', 'flashcardCollection', 'languageCollection'], result => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.selectedModel) {
      modelSelect.value = result.selectedModel;
    }
    if (result.flashcardCollection) {
      flashcardCollection = result.flashcardCollection;
    }
    if (result.languageCollection) {
      languageCollection = result.languageCollection;
    }
    updateCollectionCount();
  });

  apiKeyInput.addEventListener('change', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ apiKey });
    }
  });

  modelSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ selectedModel: modelSelect.value });
  });

  modeToggle.addEventListener('click', (e) => {
    if (e.target.classList.contains('mode-btn')) {
      mode = e.target.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
      e.target.classList.add('selected');
      updateVisibility();
    }
  });

  languageButtons.addEventListener('click', (e) => {
    if (e.target.classList.contains('mode-btn')) {
      selectedLanguage = e.target.dataset.language;
      document.querySelectorAll('#language-buttons .mode-btn').forEach(btn => btn.classList.remove('selected'));
      e.target.classList.add('selected');
    }
  });

  generateBtn.addEventListener('click', generateContent);
  addToCollectionBtn.addEventListener('click', addToCollection);
  clearCollectionBtn.addEventListener('click', clearCollection);
  exportCsvBtn.addEventListener('click', exportToCsv);

  updateVisibility();
}

function updateVisibility() {
  const systemPrompt = document.getElementById('system-prompt');
  const explainPrompt = document.getElementById('explain-prompt');
  const languagePrompt = document.getElementById('language-prompt');
  const languageButtons = document.getElementById('language-buttons');
  const generateBtn = document.getElementById('generate-btn');

  systemPrompt.style.display = mode === 'flashcard' ? 'block' : 'none';
  explainPrompt.style.display = mode === 'explain' ? 'block' : 'none';
  languagePrompt.style.display = mode === 'language' ? 'block' : 'none';
  languageButtons.style.display = mode === 'language' ? 'flex' : 'none';
  generateBtn.textContent = mode === 'flashcard' ? 'Generate Flashcards' : 'Generate Explanation';
  generateBtn.style.display = mode === 'language' ? 'none' : 'block';
}

function generateContent() {
  // Implement the logic to generate content based on the selected mode
  // This should interact with the background script to make API calls
  // and then display the results in the flashcardsContainer
}

function addToCollection() {
  const flashcardsContainer = document.getElementById('flashcards');
  const flashcards = Array.from(flashcardsContainer.children);
  if (mode === 'language') {
    languageCollection = languageCollection.concat(flashcards.map(parseLanguageFlashcard));
  } else {
    flashcardCollection = flashcardCollection.concat(flashcards.map(parseFlashcard));
  }
  chrome.storage.sync.set({ flashcardCollection, languageCollection });
  updateCollectionCount();
  flashcardsContainer.innerHTML = '';
}

function clearCollection() {
  if (confirm('Are you sure you want to clear the entire collection? This action cannot be undone.')) {
    if (mode === 'language') {
      languageCollection = [];
    } else {
      flashcardCollection = [];
    }
    chrome.storage.sync.set({ flashcardCollection, languageCollection });
    updateCollectionCount();
  }
}

function exportToCsv() {
  const collection = mode === 'language' ? languageCollection : flashcardCollection;
  let csvContent = "data:text/csv;charset=utf-8,";
  
  if (mode === 'language') {
    csvContent += "Word,Translation,Question,Answer\n";
    collection.forEach(({ word, translation, question, answer }) => {
      csvContent += `${word},${translation},${question},${answer}\n`;
    });
  } else {
    csvContent += "Question,Answer\n";
    collection.forEach(({ question, answer }) => {
      csvContent += `${question},${answer}\n`;
    });
  }

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${mode}_flashcards.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function updateCollectionCount() {
  const addToCollectionBtn = document.getElementById('add-to-collection-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const count = mode === 'language' ? languageCollection.length : flashcardCollection.length;
  addToCollectionBtn.textContent = `Add to Collection (${count})`;
  exportCsvBtn.style.display = count > 0 ? 'block' : 'none';
}

function parseFlashcard(element) {
  const question = element.querySelector('strong').textContent.slice(3);
  const answer = element.innerHTML.split('<br>')[1].split('<button')[0].trim().slice(3);
  return { question, answer };
}

function parseLanguageFlashcard(element) {
  const word = element.dataset.word;
  const translation = element.dataset.translation;
  const question = element.dataset.question;
  const answer = element.dataset.answer;
  return { word, translation, question, answer };
}

// Initialize the flashcard panel when the content script loads it
initializeFlashcardPanel();
