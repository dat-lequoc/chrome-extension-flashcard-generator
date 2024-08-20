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
    const flashcards = parseFlashcards(content, mode, text);
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

function parseFlashcards(content, mode, text) {
  const flashcards = [];
  const regex = /<T>(.*?)<\/T>|<Q>(.*?)<\/Q>|<A>(.*?)<\/A>/gs;
  let matches;
  let currentFlashcard = {};

  while ((matches = regex.exec(content)) !== null) {
    if (matches[1] !== undefined) {  // <T> tag
      if (Object.keys(currentFlashcard).length > 0) {
        flashcards.push(currentFlashcard);
      }
      currentFlashcard = { translation: matches[1].trim() };
    } else if (matches[2] !== undefined) {  // <Q> tag
      currentFlashcard.question = matches[2].trim();
    } else if (matches[3] !== undefined) {  // <A> tag
      currentFlashcard.answer = matches[3].trim();
      if (mode === 'language') {
        currentFlashcard.word = text;
        flashcards.push(currentFlashcard);
        currentFlashcard = {};
      } else if (mode === 'explain' || mode === 'flashcard') {
        flashcards.push(currentFlashcard);
        currentFlashcard = {};
      }
    }
  }

  if (Object.keys(currentFlashcard).length > 0) {
    flashcards.push(currentFlashcard);
  }

  if (mode === 'explain' && flashcards.length === 0) {
    return [{ question: 'Explanation', answer: content }];
  }

  return flashcards;
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'model', 'translationLanguage', 'targetLanguage'], async (result) => {
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
        languagePrompt: languagePrompt.trim(),
        translationLanguage: result.translationLanguage || 'Vietnamese',
        targetLanguage: result.targetLanguage || 'English'
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
