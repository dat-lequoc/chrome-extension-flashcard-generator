# Text Selection and Flashcard Generation: Functionality Explanation

## Table of Contents
1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Detailed Functionality Breakdown](#detailed-functionality-breakdown)

## Overview

This application allows users to interact with the content of the current open page, select text, and generate flashcards using AI. It focuses on enhancing the learning experience through AI-powered flashcard creation and language learning features.

## Key Features

1. **Text Selection**: Users can select text from the current open page for various purposes.
2. **Flashcard Generation**: Uses Claude AI to create flashcards from selected text.
3. **Explanation Mode**: Generates detailed explanations of selected text.
4. **Language Learning Mode**: Creates language-specific flashcards for vocabulary learning.
5. **Customizable AI Settings**: Allows users to input their API key and select the AI model.
6. **Highlight and Annotation**: Users can highlight text and add annotations.
7. **Flashcard Collection**: Users can save and export generated flashcards.

## Detailed Functionality Breakdown

### 1. Text Selection and Interaction

- Enables users to select text on the current open page
- Supports multiple selection methods (click and drag, double-click for words)
- Provides context menu options for selected text (e.g., generate flashcard, explain, translate)

### 2. Flashcard Generation

- Allows text selection for flashcard creation
- Sends selected text to Claude AI for processing
- Parses AI response to extract questions and answers
- Displays generated flashcards in the UI
- Supports adding flashcards to a collection
- Enables exporting flashcards to CSV format

### 3. Explanation Mode

- Similar to flashcard generation, but focuses on detailed explanations
- Triggered by selecting text and choosing the "Explain" option
- Displays explanations in both the main UI and a modal window
- Supports markdown rendering for formatted explanations

### 4. Language Learning Mode

- Activates on double-click of words in the content
- Generates language-specific flashcards with translations and usage examples
- Incorporates text-to-speech for pronunciation practice
- Provides quick translation of selected words or phrases

### 5. AI Integration

- Uses Anthropic's Claude AI model for text processing
- Supports multiple Claude models (e.g., Claude 3 Sonnet, Claude 3 Haiku)
- Allows users to input and save their API key
- Implements rate limiting to prevent excessive API calls

### 6. Text Highlighting and Annotation

- Allows users to highlight important passages in the content
- Supports adding annotations to highlighted text
- Provides a system for managing and reviewing highlights and annotations

### 7. User Interface Features

- Responsive design for various screen sizes
- Dark/light mode toggle for comfortable reading
- Settings panel for customizing AI and application preferences
- Floating action button for quick access to main features

### 8. Flashcard Management

- Organizes generated flashcards into decks
- Provides a review system for studying flashcards
- Supports editing and deleting existing flashcards
- Implements spaced repetition algorithms for effective learning

### 9. Data Persistence

- Uses localStorage for saving user preferences, API keys, and flashcard collections
- Implements auto-save feature for unsaved flashcards and annotations
- Syncs user data across sessions for a seamless experience

### 10. Error Handling and User Feedback

- Provides user-friendly error messages for API failures or processing issues
- Implements try-catch blocks for robust error management
- Displays loading indicators during AI processing tasks

### 11. Performance Optimization

- Implements debouncing for API calls in language learning mode
- Optimizes rendering of flashcards and explanations
- Uses efficient data structures for managing large sets of flashcards and annotations

### 12. Accessibility Features

- Ensures keyboard navigation for all main features
- Provides screen reader support for generated content
- Implements high contrast mode for better readability

This breakdown covers the major functionalities of the Text Selection and Flashcard Generation application, focusing on interaction with the current page's content and AI-powered learning features. The application creates a rich learning environment by combining intelligent text processing with flashcard generation and language learning tools.
