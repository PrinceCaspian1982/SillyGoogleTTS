// --- START OF FILE public/scripts/extensions/tts/google-tts.js ---

import { getRequestHeaders } from '../../../script.js';
import { getPreviewString, saveTtsProviderSettings } from './index.js';

export { GoogleTtsProvider };

class GoogleTtsProvider {
    static voices = [
        // This list is hardcoded for the Gemini models
        { name: 'Zephyr (Bright)', voice_id: 'Zephyr', lang: 'en-US', preview_url: false },
        { name: 'Autonoe (Bright)', voice_id: 'Autonoe', lang: 'en-US', preview_url: false },
        { name: 'Puck (Upbeat)', voice_id: 'Puck', lang: 'en-US', preview_url: false },
        { name: 'Laomedeia (Upbeat)', voice_id: 'Laomedeia', lang: 'en-US', preview_url: false },
        { name: 'Charon (Informative)', voice_id: 'Charon', lang: 'en-US', preview_url: false },
        { name: 'Rasalgethi (Informative)', voice_id: 'Rasalgethi', lang: 'en-US', preview_url: false },
        { name: 'Kore (Firm)', voice_id: 'Kore', lang: 'en-US', preview_url: false },
        { name: 'Orus (Firm)', voice_id: 'Orus', lang: 'en-US', preview_url: false },
        { name: 'Alnilam (Firm)', voice_id: 'Alnilam', lang: 'en-US', preview_url: false },
        { name: 'Fenrir (Excitable)', voice_id: 'Fenrir', lang: 'en-US', preview_url: false },
        { name: 'Aoede (Breezy)', voice_id: 'Aoede', lang: 'en-US', preview_url: false },
        { name: 'Leda (Youthful)', voice_id: 'Leda', lang: 'en-US', preview_url: false },
        { name: 'Callirhoe (Easy-going)', voice_id: 'Callirhoe', lang: 'en-US', preview_url: false },
        { name: 'Umbriel (Easy-going)', voice_id: 'Umbriel', lang: 'en-US', preview_url: false },
        { name: 'Enceladus (Breathy)', voice_id: 'Enceladus', lang: 'en-US', preview_url: false },
        { name: 'Erinome (Clear)', voice_id: 'Erinome', lang: 'en-US', preview_url: false },
        { name: 'Iapetus (Clear)', voice_id: 'Iapetus', lang: 'en-US', preview_url: false },
        { name: 'Algieba (Smooth)', voice_id: 'Algieba', lang: 'en-US', preview_url: false },
        { name: 'Despina (Smooth)', voice_id: 'Despina', lang: 'en-US', preview_url: false },
        { name: 'Schedar (Even)', voice_id: 'Schedar', lang: 'en-US', preview_url: false },
        { name: 'Algenib (Gravelly)', voice_id: 'Algenib', lang: 'en-US', preview_url: false },
        { name: 'Achird (Friendly)', voice_id: 'Achird', lang: 'en-US', preview_url: false },
        { name: 'Gacrux (Mature)', voice_id: 'Gacrux', lang: 'en-US', preview_url: false },
        { name: 'Pulcherrima (Forward)', voice_id: 'Pulcherrima', lang: 'en-US', preview_url: false },
        { name: 'Vindemiatrix (Gentle)', voice_id: 'Vindemiatrix', lang: 'en-US', preview_url: false },
        { name: 'Sadachbia (Lively)', voice_id: 'Sadachbia', lang: 'en-US', preview_url: false },
        { name: 'Zubenelgenubi (Casual)', voice_id: 'Zubenelgenubi', lang: 'en-US', preview_url: false },
        { name: 'Sadaltager (Knowledgeable)', voice_id: 'Sadaltager', lang: 'en-US', preview_url: false },
        { name: 'Sulafar (Warm)', voice_id: 'Sulafar', lang: 'en-US', preview_url: false },
        { name: 'Achernar (Soft)', voice_id: 'Achernar', lang: 'en-US', preview_url: false },
    ];

    settings;
    voices = [];
    separator = ' . ';
    audioElement = document.createElement('audio');

    defaultSettings = {
        voiceMap: {},
        model: 'gemini-2.5-flash-preview-tts',
        useNativeTts: true,
        apiType: 'makersuite',
        customEndpoint: '',
    };

    get settingsHtml() {
        return `
        <div>Use Google's TTS engine (Native Gemini TTS or Google Translate).</div>
        <small>Hint: Save an API key in the Google AI Studio/Vertex AI settings to use native TTS.</small>
        
        <div>
            <label class="checkbox_label" for="google-tts-use-native">
                <input type="checkbox" id="google-tts-use-native">
                <small>Use Native Gemini TTS (requires API key)</small>
            </label>
        </div>
        
        <div id="google-native-tts-settings" style="display: none;">
            <div>
                <label for="google-tts-api-type">API Type:</label>
                <select id="google-tts-api-type">
                    <option value="makersuite">Google AI Studio (MakerSuite)</option>
                    <option value="vertexai">Google Vertex AI</option>
                </select>
            </div>
            
            <div>
                <label for="google-tts-model">Model:</label>
                <select id="google-tts-model">
                    <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash Preview TTS</option>
                    <option value="gemini-2.5-pro-preview-tts">Gemini 2.5 Pro Preview TTS</option>
                </select>
            </div>
            
            <div>
                <label for="google-tts-custom-endpoint">Custom Endpoint (optional):</label>
                <input type="text" id="google-tts-custom-endpoint" placeholder="https://your-custom-endpoint.com">
            </div>
        </div>`;
    }

    async loadSettings(settings) {
        if (Object.keys(settings).length === 0) {
            console.info('Using default Google TTS Provider settings');
        }

        this.settings = { ...this.defaultSettings, ...settings };

        $('#google-tts-use-native').prop('checked', this.settings.useNativeTts);
        $('#google-tts-api-type').val(this.settings.apiType);
        $('#google-tts-model').val(this.settings.model);
        $('#google-tts-custom-endpoint').val(this.settings.customEndpoint);

        this.updateSettingsVisibility();

        $('#google-tts-use-native, #google-tts-api-type, #google-tts-model').on('change', () => this.onSettingsChange());
        $('#google-tts-custom-endpoint').on('input', () => this.onSettingsChange());
        
        try {
            await this.checkReady();
            console.debug('Google TTS: Settings loaded');
        } catch (err) {
            console.warn('Google TTS: Settings loaded, but not ready.', err.message);
        }
    }

    updateSettingsVisibility() {
        const useNative = $('#google-tts-use-native').is(':checked');
        $('#google-native-tts-settings').toggle(useNative);
    }

    onSettingsChange() {
        this.settings.useNativeTts = $('#google-tts-use-native').is(':checked');
        this.settings.apiType = $('#google-tts-api-type').val();
        this.settings.model = $('#google-tts-model').val();
        this.settings.customEndpoint = $('#google-tts-custom-endpoint').val().trim();
        
        this.voices = []; // Reset voices cache so it re-fetches
        saveTtsProviderSettings();
    }

    async checkReady() {
        await this.fetchTtsVoiceObjects();
    }

    async onRefreshClick() {
        await this.checkReady();
    }

    async getVoice(voiceName) {
        if (this.voices.length === 0) {
            this.voices = await this.fetchTtsVoiceObjects();
        }
        
        const match = this.voices.find(voice => voice.name === voiceName || voice.voice_id === voiceName);
        
        if (!match) {
            throw `TTS Voice name ${voiceName} not found`;
        }
        return match;
    }

    async generateTts(text, voiceId) {
        if (this.settings.useNativeTts) {
            return await this.fetchNativeTtsGeneration(text, voiceId);
        } else {
            return await this.fetchGoogleTranslateTts(text, voiceId);
        }
    }

    async fetchTtsVoiceObjects() {
        if (this.voices.length > 0) return this.voices;

        if (this.settings.useNativeTts) {
            this.voices = GoogleTtsProvider.voices;
        } else {
            const response = await fetch('/api/google/list-voices', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            const responseJson = await response.json();
            this.voices = Object.entries(responseJson)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(x => ({ name: x[1], voice_id: x[0], preview_url: false, lang: x[0] }));
        }
        return this.voices;
    }

    async previewTtsVoice(id) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        
        try {
            const voice = await this.getVoice(id);
            const text = getPreviewString(voice.lang || 'en-US');
            
            let response;
            if (this.settings.useNativeTts) {
                response = await this.fetchNativeTtsGeneration(text, id);
            } else {
                response = await this.fetchGoogleTranslateTts(text, id);
            }
            
            if (!response.ok) {
                // Error is handled inside the fetch function, but we still need to stop here
                return;
            }
    
            const audioBlob = await response.blob();
            const url = URL.createObjectURL(audioBlob);
            this.audioElement.src = url;
            this.audioElement.play();
            this.audioElement.onended = () => URL.revokeObjectURL(url);

        } catch (error) {
            console.error('TTS Preview Error:', error);
            toastr.error(`Could not generate preview: ${error.message}`);
        }
    }

    async fetchNativeTtsGeneration(text, voiceId) {
        console.info(`Generating native Google TTS for voice_id ${voiceId}`);
        
        const response = await fetch('/api/google/generate-native-tts', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                text: text,
                voice: voiceId,
                model: this.settings.model,
                apiType: this.settings.apiType,
                customEndpoint: this.settings.customEndpoint,
            }),
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorJson = await response.json();
                if (errorJson.error) {
                    errorMessage = errorJson.error;
                }
            } catch {
                // Not a JSON response, do nothing and keep the original http error
            }
            throw new Error(errorMessage);
        }
        return response;
    }

    async fetchGoogleTranslateTts(text, voiceId) {
        console.info(`Generating Google Translate TTS for voice_id ${voiceId}`);
        
        const response = await fetch('/api/google/generate-voice', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                text: Array.isArray(text) ? text : [text],
                voice: voiceId,
            }),
        });

        if (!response.ok) {
            toastr.error(response.statusText, 'TTS Generation Failed');
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        return response;
    }
}