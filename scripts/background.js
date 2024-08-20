chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateFlashcards') {
    generateFlashcards(request.text, request.mode, sendResponse);
    return true;  // Indicates we will send a response asynchronously
  }
});

async function generateFlashcards(text, mode, sendResponse) {
  try {
    const settings = await getSettings();
    if (!settings.apiKey) {
      throw new Error('API key not set. Please set it in the extension options.');
    }

    const prompt = generatePrompt(text, mode, settings);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    const flashcards = parseFlashcards(content, mode);
    sendResponse({ success: true, flashcards });
  } catch (error) {
    console.error('Error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function generatePrompt(text, mode, settings) {
  switch (mode) {
    case 'flashcard':
      return `${settings.flashcardPrompt}\n\nText: ${text}`;
    case 'explain':
      return `${settings.explainPrompt}\n\nText: ${text}`;
    case 'language':
      return `${settings.languagePrompt}\n\nText: ${text}`;
    default:
      return `Summarize the key points of the following text:\n\n${text}`;
  }
}

function parseFlashcards(content, mode) {
  if (mode === 'language') {
    const entries = content.split('\n\n');
    return entries.map(entry => {
      const lines = entry.split('\n');
      return {
        word: lines[0].split(': ')[1],
        translation: lines[1].split(': ')[1],
        question: lines[2].split(': ')[1],
        answer: lines[3].split(': ')[1]
      };
    });
  } else if (mode === 'explain') {
    return [{ question: 'Explanation', answer: content }];
  } else {
    const flashcards = [];
    const lines = content.split('\n');
    let currentQuestion = '';
    for (const line of lines) {
      if (line.startsWith('Q:')) {
        if (currentQuestion) {
          flashcards.push({ question: currentQuestion, answer: '' });
        }
        currentQuestion = line.slice(2).trim();
      } else if (line.startsWith('A:')) {
        flashcards[flashcards.length - 1].answer = line.slice(2).trim();
      }
    }
    return flashcards;
  }
}

async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['apiKey', 'model', 'flashcardPrompt', 'explainPrompt', 'languagePrompt'], result => {
      resolve({
        apiKey: result.apiKey,
        model: result.model || 'claude-3-5-sonnet-20240620',
        flashcardPrompt: result.flashcardPrompt || 'Generate concise flashcards based on the following text. Create 3-5 flashcards, each with a question (Q:) and an answer (A:). The questions should test key concepts, and the answers should be brief but complete.',
        explainPrompt: result.explainPrompt || 'Explain the following text in simple terms, focusing on the main concepts and their relationships. Use clear and concise language, and break down complex ideas into easily understandable parts.',
        languagePrompt: result.languagePrompt || 'For the following text, identify key terms or phrases and provide their definitions and usage examples. Format each entry as follows:\nWord: [term]\nTranslation: [brief translation or equivalent]\nExample: [example sentence using the term]\nMeaning: [concise explanation]'
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage();
});
