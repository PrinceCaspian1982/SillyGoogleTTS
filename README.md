# SillyGoogleTTS

**SillyGoogleTTS** is a plug-and-play Text-to-Speech extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern). It enables native Google Gemini TTS by using `fluent-ffmpeg` to convert raw audio into a high-quality MP3 on the fly.

---

## ✨ Features

| Feature                 | Google Translate | Gemini 2.x Native   |
| ----------------------- | ---------------- | ------------------- |
| On-the-fly MP3 Conversion| n/a              | ✅                  |
| 30+ Pre-tuned EN Voices | ❌               | ✅                  |
| API Key Required        | ❌               | ✅                  |
| Works Offline           | ❌               | ❌                  |
| Voice-map Friendly      | ✅               | ✅                  |

---

## 📋 Prerequisites

| Requirement                          | Why it's needed                                   |
| ------------------------------------ | ------------------------------------------------- |
| **SillyTavern**                      | The required runtime environment                  |
| **`fluent-ffmpeg`**                  | To convert raw Gemini audio into playable MP3     |
| **Google AI or Vertex AI API Key**   | Required to access the native Gemini TTS feature  |

---

## 🚀 Installation Guide

Follow these steps precisely to add the enhanced TTS provider to your SillyTavern installation.

### Step 1: Install the Backend Dependency

First, you need to install the required library for audio processing.

1.  Open a command prompt or terminal.
2.  Navigate to your main **SillyTavern folder** (the one with `start.bat` or `start.sh`).
3.  Stop SillyTavern if it is currently running.
4.  Run the following command:
    ```bash
    npm install fluent-ffmpeg
    ```

### Step 2: Add and Replace the Necessary Files

You will need to replace **two** existing files and create **one** new file.

1.  **REPLACE** the existing backend endpoint file:
    -   **File:** `src/endpoints/google.js`
    -   **Destination:** `<Your SillyTavern Folder>/src/endpoints/google.js`

2.  **CREATE** this new frontend provider file:
    -   **File:** `public/scripts/extensions/tts/google-tts.js`
    -   **Destination:** `<Your SillyTavern Folder>/public/scripts/extensions/tts/google-tts.js`

3.  **REPLACE** the existing TTS index file to register the new provider:
    -   **File:** `public/scripts/extensions/tts/index.js`
    -   **Destination:** `<Your SillyTavern Folder>/public/scripts/extensions/tts/index.js`

### Step 3: Configure in SillyTavern

With the files in place, start SillyTavern and configure the extension.

1.  Start SillyTavern using `start.bat` or `start.sh`.
2.  Go to the **Extensions panel** (the plug icon) -> **TTS** tab.
3.  From the **Select TTS Provider** dropdown, choose **Google TTS**.
4.  Click the **Reload** button next to the dropdown.
5.  Check the box for **"Use Native Gemini TTS (requires API key)"**.
6.  Go to the **API Connections panel** -> **Chat Completion** -> **Google AI Studio**.
7.  Paste your **Google AI Studio API key** into the field.
8.  Return to the **TTS extension settings** to assign the new Gemini voices to your characters in the **Voice Map**. You're ready to go!

---

## ❓ Troubleshooting

-   **TTS generation fails with an `ffmpeg` error:** This means the dependency from Step 1 was not installed correctly. Stop SillyTavern and run `npm install fluent-ffmpeg` again in your SillyTavern root folder.
-   **"No API key found" error:** Ensure you have correctly pasted your API key in the **API Connections** panel for Google AI Studio.
-   **Voices don't appear in the Voice Map:** Click the **Reload** button in the TTS settings. If they still don't appear, your API key may be invalid or lack the necessary permissions.
