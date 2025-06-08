# SillyGoogleTTS

**SillyGoogleTTS** is a plug-and-play Text-to-Speech extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern).  
It unlocks both **Google Translate TTS** *and* **Gemini 2.x Native TTS** (Google AI Studio / Vertex AI) with real-time MP3 streaming.

---

## ✨ Features

|                         | Google Translate | Gemini 2.x Native |
|-------------------------|-----------------|-------------------|
| Streaming playback      | ✅              | ✅ |
| 30+ pre-tuned EN voices | ❌              | ✅ |
| Multilingual            | ✅ (via locale) | 🚧 _(road-map)_ |
| Works offline after init| ✅              | ✅ |
| Voice-map friendly      | ✅              | ✅ |

---

## 🖥️ Prerequisites

| Requirement | Why it’s needed |
|-------------|-----------------|
| **Node 18 +** | SillyTavern runtime |
| **ffmpeg** + **fluent-ffmpeg** | Transcodes raw PCM → MP3 on the fly |
| Google AI Studio *or* Vertex AI key | Only for Gemini Native |

Install ffmpeg first, then inside your SillyTavern folder:

```bash
npm install fluent-ffmpeg
