// --- START OF FILE src/endpoints/google.js ---
import { Buffer } from 'node:buffer';
import fetch from 'node-fetch';
import express from 'express';
import { speak, languages } from 'google-translate-api-x';
import { GoogleAuth } from 'google-auth-library';

import { readSecret, SECRET_KEYS } from './secrets.js';
import { GEMINI_SAFETY } from '../constants.js';

const API_MAKERSUITE = 'https://generativelanguage.googleapis.com';
const API_VERTEX_AI = 'https://us-central1-aiplatform.googleapis.com';

// ### START: Functions required by SillyTavern Staging ###
export function getProjectIdFromServiceAccount(serviceAccount) {
    try {
        const key = JSON.parse(serviceAccount);
        return key.project_id;
    } catch (err) {
        console.error('Failed to parse Vertex AI service account JSON:', err);
        return null;
    }
}

export function getVertexAIAuth() {
    return new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
}
// ### END: Functions required by SillyTavern Staging ###


// ### START: Helper functions for WAV creation ###
function createWavHeader(dataSize, sampleRate, numChannels = 1, bitsPerSample = 16) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
    header.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return header;
}

function createCompleteWavFile(pcmData, sampleRate) {
    const header = createWavHeader(pcmData.length, sampleRate);
    return Buffer.concat([header, pcmData]);
}
// ### END: Helper functions for WAV creation ###


export const router = express.Router();

router.post('/caption-image', async (request, response) => {
    try {
        const mimeType = request.body.image.split(';')[0].split(':')[1];
        const base64Data = request.body.image.split(',')[1];
        const useVertexAi = request.body.api === 'vertexai';
        const apiName = useVertexAi ? 'Google Vertex AI' : 'Google AI Studio';
        let apiKey;
        let apiUrl;
        if (useVertexAi) {
            apiKey = request.body.reverse_proxy ? request.body.proxy_password : readSecret(request.user.directories, SECRET_KEYS.VERTEXAI);
            apiUrl = new URL(request.body.reverse_proxy || API_VERTEX_AI);
        } else {
            apiKey = request.body.reverse_proxy ? request.body.proxy_password : readSecret(request.user.directories, SECRET_KEYS.MAKERSUITE);
            apiUrl = new URL(request.body.reverse_proxy || API_MAKERSUITE);
        }
        const model = request.body.model || 'gemini-2.0-flash';
        let url;
        if (useVertexAi) {
            url = `${apiUrl.origin}/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;
        } else {
            url = `${apiUrl.origin}/v1beta/models/${model}:generateContent?key=${apiKey}`;
        }
        const body = {
            contents: [{
                role: 'user',
                parts: [
                    { text: request.body.prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data,
                        },
                    }],
            }],
            safetySettings: GEMINI_SAFETY,
        };

        const result = await fetch(url, {
            body: JSON.stringify(body),
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!result.ok) {
            const error = await result.json();
            console.error(`${apiName} API returned error: ${result.status} ${result.statusText}`, error);
            return response.status(500).send({ error: true });
        }

        const data = await result.json();
        const candidates = data?.candidates;
        if (!candidates) {
            return response.status(500).send('No candidates found, image was most likely filtered.');
        }

        const caption = candidates[0].content.parts[0].text;
        if (!caption) {
            return response.status(500).send('No caption found');
        }

        return response.json({ caption });
    } catch (error) {
        console.error(error);
        response.status(500).send('Internal server error');
    }
});

router.post('/list-voices', (_, response) => {
    return response.json(languages);
});

router.post('/generate-voice', async (request, response) => {
    try {
        const text = request.body.text;
        const voice = request.body.voice ?? 'en';

        const result = await speak(text, { to: voice, forceBatch: false });
        const buffer = Array.isArray(result)
            ? Buffer.concat(result.map(x => new Uint8Array(Buffer.from(x.toString(), 'base64'))))
            : Buffer.from(result.toString(), 'base64');

        response.setHeader('Content-Type', 'audio/mpeg');
        return response.send(buffer);
    } catch (error) {
        console.error('Google Translate TTS generation failed', error);
        response.status(500).send('Internal server error');
    }
});

router.post('/generate-native-tts', async (request, response) => {
    try {
        const { text, voice, model, apiType, customEndpoint } = request.body;
        const useVertexAi = apiType === 'vertexai';
        const apiName = useVertexAi ? 'Google Vertex AI' : 'Google AI Studio';

        let apiKey;
        let apiUrl;

        if (useVertexAi) {
            apiKey = readSecret(request.user.directories, SECRET_KEYS.VERTEXAI);
            apiUrl = new URL(customEndpoint || API_VERTEX_AI);
        } else {
            apiKey = readSecret(request.user.directories, SECRET_KEYS.MAKERSUITE);
            apiUrl = new URL(customEndpoint || API_MAKERSUITE);
        }

        if (!apiKey) {
            return response.status(400).json({ error: `No API key found for ${apiName}. Please set it up in the API Connections panel.` });
        }

        let url;
        if (useVertexAi) {
            url = `${apiUrl.origin}/v1/publishers/google/models/${model}:generateContent?key=${apiKey}`;
        } else {
            url = `${apiUrl.origin}/v1beta/models/${model}:generateContent?key=${apiKey}`;
        }

        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{ text: text }],
            }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voice,
                        },
                    },
                },
            },
            safetySettings: GEMINI_SAFETY,
        };

        const result = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!result.ok) {
            const errorText = await result.text();
            console.error(`${apiName} native TTS API error: ${result.status} ${result.statusText}`, errorText);
            const errorMessage = JSON.parse(errorText).error?.message || 'TTS generation failed.';
            return response.status(result.status).json({ error: errorMessage });
        }

        const data = await result.json();
        const audioPart = data?.candidates?.[0]?.content?.parts?.[0];
        const audioData = audioPart?.inlineData?.data;
        const mimeType = audioPart?.inlineData?.mimeType;

        if (!audioData) {
            return response.status(500).json({ error: 'No audio data found in response' });
        }

        const audioBuffer = Buffer.from(audioData, 'base64');

        // NEW LOGIC: If the audio is raw PCM, wrap it in a WAV header and send it.
        if (mimeType && mimeType.toLowerCase().includes('audio/l16')) {
            const rateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
            const pcmData = audioBuffer;
            
            // Create a complete, playable WAV file buffer.
            const wavBuffer = createCompleteWavFile(pcmData, sampleRate);
            
            // Send the WAV file directly to the browser. This is much faster.
            response.setHeader('Content-Type', 'audio/wav');
            return response.send(wavBuffer);
        }
        
        // Fallback for any other audio format Google might send in the future.
        response.setHeader('Content-Type', mimeType || 'application/octet-stream');
        response.send(audioBuffer);

    } catch (error) {
        console.error('Google native TTS generation failed:', error);
        if (!response.headersSent) {
            response.status(500).json({ error: 'Internal server error during TTS generation', details: error.message });
        }
    }
});