# SillyGoogleTTS

**SillyGoogleTTS** is a plug-and-play Text-to-Speech extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern). It enables native Google Gemini TTS by efficiently wrapping raw audio into a browser-compatible WAV file on the fly, making it faster and reducing server load.

---

## ✨ Features

| Feature                  | Google Translate | Gemini 2.x Native   |
| ------------------------ | ---------------- | ------------------- |
| On-the-fly WAV Creation  | n/a              | ✅                  |
| 30+ Pre-tuned EN Voices  | ❌               | ✅                  |
| API Key Required         | ❌               | ✅                  |
| Works Offline            | ❌               | ❌                  |
| Voice-map Friendly       | ✅               | ✅                  |
| Fast & Low-Resource      | ❌               | ✅                  |


---

## 📋 Prerequisites

| Requirement                          | Why it's needed                                   |
| ------------------------------------ | ------------------------------------------------- |
| **SillyTavern**                      | The required runtime environment                  |
| **[FFmpeg](https://ffmpeg.org/download.html)** (Recommended) | While this extension no longer uses FFmpeg for native TTS, other SillyTavern features or TTS providers may still need it. It's best to have it installed and in your PATH. |
| **Google AI or Vertex AI API Key**   | Required to access the native Gemini TTS feature  |

---

## 🚀 Installation Guide

Follow these steps precisely to add the enhanced TTS provider to your SillyTavern installation.

### Step 1: Install Backend Dependencies

To ensure compatibility and prevent startup errors, we will first ensure the base environment is correct, and then explicitly install all packages required for this extension.

1.  Open a command prompt or terminal.
2.  Navigate to your main **SillyTavern folder** (the one with `start.bat` or `start.sh`).
3.  Stop SillyTavern if it is currently running.
4.  Run the following commands one by one. It is crucial to run all three to ensure a stable installation.

    First, install SillyTavern's core dependencies:
    ```bash
    npm install
    ```
    Next, force-install a Google package that recent SillyTavern versions require. This prevents a common startup error.
    ```bash
    npm install google-auth-library
    ```
    Finally, install the library needed for some TTS providers (though no longer for this one's native mode):
    ```bash
    npm install fluent-ffmpeg
    ```

### Step 2: Add and Replace the Necessary Files

You will need to replace **two** existing files and create **one** new file. **Crucially, the backend `google.js` file must be fully replaced with the one from this extension to ensure compatibility.**

1.  **REPLACE** the existing backend endpoint file. This is critical to avoid startup errors.
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
2.  Go to the **Extensions panel** (the three blocks icon) -> **TTS** tab.
3.  From the **Select TTS Provider** dropdown, choose **Google TTS**.
4.  Click the **Reload** button next to the dropdown.
5.  Check the box for **"Use Native Gemini TTS (requires API key)"**.
6.  Go to the **API Connections panel** (the plug icon) -> **Chat Completion** -> **Google AI Studio**.
7.  Paste your **Google AI Studio API key** into the field.
8.  Return to the **TTS extension settings** to assign the new Gemini voices to your characters in the **Voice Map**. You're ready to go!

---

## ❓ Troubleshooting

-   **Server fails to start with an `ERR_MODULE_NOT_FOUND` error:** This means a dependency was not installed correctly. Stop SillyTavern and carefully re-run all three commands from **Installation Guide - Step 1**.

-   **TTS generation fails:** Check the SillyTavern server console for errors. It will often give a clear message.

-   **"No API key found" error:** Ensure you have correctly pasted your API key in the **API Connections** panel for Google AI Studio or Vertex AI.

-   **Voices don't appear in the Voice Map:** Click the **Reload** button in the TTS settings. If they still don't appear, your API key may be invalid or lack the necessary permissions.