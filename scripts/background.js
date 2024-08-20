let flashcardCollections = {
  flashcard: [],
  explain: [],
  language: []
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateFlashcards') {
    generateFlashcards(request.text, request.mode, sendResponse, request.context);
    return true;  // Indicates we will send a response asynchronously
  } else if (request.action === 'updateCollection') {
    updateCollection(request.mode, request.flashcards);
    sendResponse({success: true});
  } else if (request.action === 'getCollection') {
    sendResponse({collection: flashcardCollections[request.mode]});
  } else if (request.action === 'clearCollection') {
    clearCollection(request.mode);
    sendResponse({success: true});
  }
});

function updateCollection(mode, flashcards) {
  flashcardCollections[mode] = flashcards;
  chrome.storage.sync.set({flashcardCollections}, () => {
    console.log('Collection updated and saved');
  });
}

function clearCollection(mode) {
  flashcardCollections[mode] = [];
  chrome.storage.sync.set({flashcardCollections}, () => {
    console.log('Collection cleared and saved');
  });
}

async function generateFlashcards(text, mode, sendResponse, context = '') {
  console.log('generateFlashcards called with:', { text, mode, context });
  try {
    const settings = await getSettings();
    console.log('Settings retrieved:', settings);
    if (!settings.apiKey) {
      throw new Error('API key not set. Please set it in the extension options.');
    }

    const prompt = generatePrompt(text, mode, settings, context);
    console.log('Generated prompt:', prompt);

    const requestBody = {
      model: settings.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    };
    console.log('Request body:', JSON.stringify(requestBody));

    console.log('Sending request to API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response error:', response.status, response.statusText, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Unexpected API response format');
    }

    const content = data.content[0].text;
    console.log('Parsed content:', content);
    const flashcards = parseFlashcards(content, mode);
    console.log('Generated flashcards:', flashcards);
    sendResponse({ success: true, flashcards });
  } catch (error) {
    console.error('Error in generateFlashcards:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function generatePrompt(text, mode, settings, context = '') {
  console.log("genP", text, mode);
  console.log(settings);
  switch (mode) {
    case 'flashcard':
      return settings.flashcardPrompt.replace('{{TEXT}}', text);
    case 'explain':
      return settings.explainPrompt.replace('{{TEXT}}', text);
    case 'language':
      return settings.languagePrompt
        .replace('{{WORD}}', text)
        .replace('{{PHRASE}}', context)
        .replace('{{TRANSLATION_LANGUAGE}}', settings.translationLanguage)
        .replace('{{TARGET_LANGUAGE}}', settings.targetLanguage);
    default:
      return `Summarize the key points of the following text:\n\n${text}`;
  }
}

function parseFlashcards(content, mode) {
  if (mode === 'language') {
    console.log("parseFlashcards:", content);
    const entries = content.split('\n\n');
    return entries.map(entry => {
      const lines = entry.split('\n');
      return {
        word: lines[0]?.split(': ')[1] || '',
        translation: lines[1]?.split(': ')[1] || '',
        question: lines[2]?.split(': ')[1] || '',
        answer: lines[3]?.split(': ')[1] || ''
      };
    });
  } else if (mode === 'explain') {
    return [{ question: 'Explanation', answer: content }];
  } else {
    const flashcards = [];
    const lines = content.split('\n');
    let currentFlashcard = { question: '', answer: '' };
    for (const line of lines) {
      if (line.startsWith('Q:')) {
        if (currentFlashcard.question) {
          flashcards.push(currentFlashcard);
          currentFlashcard = { question: '', answer: '' };
        }
        currentFlashcard.question = line.slice(2).trim();
      } else if (line.startsWith('A:')) {
        currentFlashcard.answer = line.slice(2).trim();
      }
    }
    if (currentFlashcard.question) {
      flashcards.push(currentFlashcard);
    }
    return flashcards;
  }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'model'], async (result) => {
      const [flashcardPrompt, explainPrompt, languagePrompt] = await Promise.all([
        fetch(chrome.runtime.getURL('prompts/flashcard_prompt.txt')).then(response => response.text()),
        fetch(chrome.runtime.getURL('prompts/explain_prompt.txt')).then(response => response.text()),
        fetch(chrome.runtime.getURL('prompts/language_prompt.txt')).then(response => response.text())
      ]);

      resolve({
        apiKey: result.apiKey,
        model: result.model || 'claude-3-5-sonnet-20240620',
        flashcardPrompt: flashcardPrompt.trim(),
        explainPrompt: explainPrompt.trim(),
        languagePrompt: languagePrompt.trim()
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "showPanel" });
});

// Load flashcard collections from storage when the extension starts
chrome.storage.sync.get('flashcardCollections', (result) => {
  if (result.flashcardCollections) {
    flashcardCollections = result.flashcardCollections;
  }
});
