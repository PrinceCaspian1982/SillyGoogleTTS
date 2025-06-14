// --- START OF FILE public/scripts/extensions/tts/index.js ---
import { cancelTtsPlay, eventSource, event_types, getCurrentChatId, isStreamingEnabled, name2, saveSettingsDebounced, substituteParams } from '../../../script.js';
import { ModuleWorkerWrapper, extension_settings, getContext, renderExtensionTemplateAsync } from '../../extensions.js';
import { delay, escapeRegex, getBase64Async, getStringHash, onlyUnique } from '../../utils.js';
import { EdgeTtsProvider } from './edge.js';
import { ElevenLabsTtsProvider } from './elevenlabs.js';
import { SileroTtsProvider } from './silerotts.js';
import { GptSovitsV2Provider } from './gpt-sovits-v2.js';
import { CoquiTtsProvider } from './coqui.js';
import { SystemTtsProvider } from './system.js';
import { NovelTtsProvider } from './novel.js';
import { power_user } from '../../power-user.js';
import { OpenAITtsProvider } from './openai.js';
import { OpenAICompatibleTtsProvider } from './openai-compatible.js';
import { XTTSTtsProvider } from './xtts.js';
import { VITSTtsProvider } from './vits.js';
import { GSVITtsProvider } from './gsvi.js';
import { SBVits2TtsProvider } from './sbvits2.js';
import { AllTalkTtsProvider } from './alltalk.js';
import { CosyVoiceProvider } from './cosyvoice.js';
import { SpeechT5TtsProvider } from './speecht5.js';
import { AzureTtsProvider } from './azure.js';
import { SlashCommandParser } from '../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../slash-commands/SlashCommandArgument.js';
import { debounce_timeout } from '../../constants.js';
import { SlashCommandEnumValue, enumTypes } from '../../slash-commands/SlashCommandEnumValue.js';
import { enumIcons } from '../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { POPUP_TYPE, callGenericPopup } from '../../popup.js';
import { GoogleTranslateTtsProvider } from './google-translate.js';
import { GoogleTtsProvider } from './google-tts.js'; // The new provider
import { KokoroTtsProvider } from './kokoro.js';

const UPDATE_INTERVAL = 1000;
const wrapper = new ModuleWorkerWrapper(moduleWorker);

let voiceMapEntries = [];
let voiceMap = {}; // {charName:voiceid, charName2:voiceid2}
let lastChatId = null;
let lastMessage = null;
let lastMessageHash = null;
let periodicMessageGenerationTimer = null;
let lastPositionOfParagraphEnd = -1;
let currentInitVoiceMapPromise = null;
let ttsGenerationTimer = null; // Holds the setInterval for the elapsed time indicator

const DEFAULT_VOICE_MARKER = '[Default Voice]';
const DISABLED_VOICE_MARKER = 'disabled';

const narratedMessageAudio = {};
const errorAudio = new Audio('/sounds/error.mp3');


export function getPreviewString(lang) {
    const previewStrings = {
        'en-US': 'The quick brown fox jumps over the lazy dog',
        'en-GB': 'Sphinx of black quartz, judge my vow',
        'fr-FR': 'Portez ce vieux whisky au juge blond qui fume',
        'de-DE': 'Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich',
        'it-IT': 'Pranzo d\'acqua fa volti sghembi',
        'es-ES': 'Quiere la boca exhausta vid, kiwi, piña y fugaz jamón',
        'es-MX': 'Fabio me exige, sin tapujos, que añada cerveza al whisky',
        'ru-RU': 'В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!',
        'pt-BR': 'Vejo xá gritando que fez show sem playback.',
        'pt-PR': 'Todo pajé vulgar faz boquinha sexy com kiwi.',
        'uk-UA': 'Фабрикуймо гідність, лящім їжею, ґав хапаймо, з\'єднавці чаш!',
        'pl-PL': 'Pchnąć w tę łódź jeża lub ośm skrzyń fig',
        'cs-CZ': 'Příliš žluťoučký kůň úpěl ďábelské ódy',
        'sk-SK': 'Vyhŕňme si rukávy a vyprážajme čínske ryžové cestoviny',
        'hu-HU': 'Árvíztűrő tükörfúrógép',
        'tr-TR': 'Pijamalı hasta yağız şoföre çabucak güvendi',
        'nl-NL': 'De waard heeft een kalfje en een pinkje opgegeten',
        'sv-SE': 'Yxskaftbud, ge vårbygd, zinkqvarn',
        'da-DK': 'Quizdeltagerne spiste jordbær med fløde, mens cirkusklovnen Walther spillede på xylofon',
        'ja-JP': 'いろはにほへと　ちりぬるを　わかよたれそ　つねならむ　うゐのおくやま　けふこえて　あさきゆめみし　ゑひもせす',
        'ko-KR': '가나다라마바사아자차카타파하',
        'zh-CN': '我能吞下玻璃而不傷身体',
        'ro-RO': 'Muzicologă în bej vând whisky și tequila, preț fix',
        'bg-BG': 'Щъркелите се разпръснаха по цялото небе',
        'el-GR': 'Ταχίστη αλώπηξ βαφής ψημένη γη, δρασκελίζει υπέρ νωθρού κυνός',
        'fi-FI': 'Voi veljet, miksi juuri teille myin nämä vehkeet?',
        'he-IL': 'הקצינים צעקו: "כל הכבוד לצבא הצבאות!"',
        'id-ID': 'Jangkrik itu memang enak, apalagi kalau digoreng',
        'ms-MY': 'Muzik penyanyi wanita itu menggambarkan kehidupan yang penuh dengan duka nestapa',
        'th-TH': 'เป็นไงบ้างครับ ผมชอบกินข้าวผัดกระเพราหมูกรอบ',
        'vi-VN': 'Cô bé quàng khăn đỏ đang ngồi trên bãi cỏ xanh',
        'ar-SA': 'أَبْجَدِيَّة عَرَبِيَّة',
        'hi-IN': 'श्वेता ने श्वेता के श्वेते हाथों में श्वेता का श्वेता चावल पकड़ा',
    };
    const fallbackPreview = 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet';

    return previewStrings[lang] ?? fallbackPreview;
}

const ttsProviders = {
    AllTalk: AllTalkTtsProvider,
    Azure: AzureTtsProvider,
    Coqui: CoquiTtsProvider,
    'CosyVoice (Unofficial)': CosyVoiceProvider,
    Edge: EdgeTtsProvider,
    ElevenLabs: ElevenLabsTtsProvider,
    'Google TTS': GoogleTtsProvider, // Our new provider
    'Google Translate': GoogleTranslateTtsProvider,
    GSVI: GSVITtsProvider,
    'GPT-SoVITS-V2 (Unofficial)': GptSovitsV2Provider,
    Kokoro: KokoroTtsProvider,
    Novel: NovelTtsProvider,
    OpenAI: OpenAITtsProvider,
    'OpenAI Compatible': OpenAICompatibleTtsProvider,
    SBVits2: SBVits2TtsProvider,
    Silero: SileroTtsProvider,
    SpeechT5: SpeechT5TtsProvider,
    System: SystemTtsProvider,
    VITS: VITSTtsProvider,
    XTTSv2: XTTSTtsProvider,
};
let ttsProvider;
let ttsProviderName;

function getMessageButtonsContainer(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) return null;
    return messageElement.find('.mes_buttons');
}

function removeTtsIndicators(messageId) {
    if (ttsGenerationTimer) {
        clearInterval(ttsGenerationTimer);
        ttsGenerationTimer = null;
    }
    const buttonContainer = getMessageButtonsContainer(messageId);
    if (buttonContainer) {
        buttonContainer.find('.tts-timer-indicator, .tts-error-indicator').remove();
    }
}

function addTtsTimer(messageId) {
    const buttonContainer = getMessageButtonsContainer(messageId);
    if (!buttonContainer) return;

    removeTtsIndicators(messageId);

    const timerElement = $(`
        <div class="tts-timer-indicator">
            <i class="fa-solid fa-hourglass-half fa-spin"></i>
            <span>Generating... 0s</span>
        </div>
    `);
    buttonContainer.append(timerElement);

    let seconds = 0;
    ttsGenerationTimer = setInterval(() => {
        seconds++;
        timerElement.find('span').text(`Generating... ${seconds}s`);
    }, 1000);
}

function addTtsErrorIcon(messageId, errorMessage) {
    const buttonContainer = getMessageButtonsContainer(messageId);
    if (!buttonContainer) return;

    removeTtsIndicators(messageId);

    const errorElement = $(`
        <div class="tts-error-indicator" title="${errorMessage}">
            <i class="fa-solid fa-circle-xmark" style="color: red;"></i>
        </div>
    `);
    buttonContainer.append(errorElement);
}

function addTtsControlsToMessage(messageId) {
    const buttonContainer = getMessageButtonsContainer(messageId);
    if (!buttonContainer) return;

    if (buttonContainer.find('.mes_replay_tts').length > 0) return;

    removeTtsIndicators(messageId);

    const replayButton = `
        <div class="mes_replay_tts" title="Replay TTS">
            <i class="fa-solid fa-rotate-right"></i>
        </div>
    `;
    const downloadButton = `
        <div class="mes_download_tts" title="Download TTS Audio">
            <i class="fa-solid fa-download"></i>
        </div>
    `;
    buttonContainer.append(replayButton).append(downloadButton);
}

async function onTtsReplayClick() {
    const messageId = $(this).closest('.mes').attr('mesid');
    const audioBlob = narratedMessageAudio[messageId];

    if (audioBlob) {
        resetTtsPlayback();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement.src = audioUrl;
        audioElement.play();
        audioElement.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
    } else {
        toastr.warning('No audio found for this message. Please generate it first.');
    }
}

function onTtsDownloadClick() {
    const messageId = $(this).closest('.mes').attr('mesid');
    const audioBlob = narratedMessageAudio[messageId];

    if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SillyTavern_TTS_${messageId}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        toastr.warning('No audio found for this message. Please generate it first.');
    }
}


async function onNarrateOneMessage() {
    audioElement.src = '/sounds/silence.mp3';
    const context = getContext();
    const id = $(this).closest('.mes').attr('mesid');
    const message = context.chat[id];

    if (!message) {
        return;
    }

    resetTtsPlayback();
    processAndQueueTtsMessage(message, id);
    moduleWorker();
}

async function onNarrateText(args, text) {
    if (!text) {
        return '';
    }

    audioElement.src = '/sounds/silence.mp3';

    await initVoiceMap(true);

    const baseName = args?.voice || name2;
    const name = (baseName === 'SillyTavern System' ? DEFAULT_VOICE_MARKER : baseName) || DEFAULT_VOICE_MARKER;

    const voiceMapEntry = voiceMap[name] === DEFAULT_VOICE_MARKER
        ? voiceMap[DEFAULT_VOICE_MARKER]
        : voiceMap[name];

    if (!voiceMapEntry || voiceMapEntry === DISABLED_VOICE_MARKER) {
        toastr.info(`Specified voice for ${name} was not found. Check the TTS extension settings.`);
        return;
    }

    resetTtsPlayback();
    processAndQueueTtsMessage({ mes: text, name: name }, null);
    await moduleWorker();

    await initVoiceMap(false);
    return '';
}

async function moduleWorker() {
    if (!extension_settings.tts.enabled) {
        return;
    }

    processTtsQueue();
    processAudioJobQueue();
    updateUiAudioPlayState();
}

function resetTtsPlayback() {
    cancelTtsPlay();
    removeTtsIndicators(currentTtsJob?.id);
    currentTtsJob = null;
    currentAudioJob = null;
    audioElement.currentTime = 0;
    audioElement.src = '';
    ttsJobQueue.splice(0, ttsJobQueue.length);
    audioJobQueue.splice(0, audioJobQueue.length);
    audioQueueProcessorReady = true;
}

function isTtsProcessing() {
    let processing = false;
    if (ttsJobQueue.length > 0 || audioJobQueue.length > 0) {
        processing = true;
    }
    if (currentTtsJob != null || currentAudioJob != null) {
        processing = true;
    }
    return processing;
}

function processAndQueueTtsMessage(message, messageId) {
    const jobBase = { ...message, id: messageId };

    if (!extension_settings.tts.narrate_by_paragraphs) {
        ttsJobQueue.push(jobBase);
        return;
    }

    const lines = message.mes.split('\n');
    for (const line of lines) {
        if (line.length > 0) {
            ttsJobQueue.push({ ...jobBase, mes: line });
        }
    }
}

function debugTtsPlayback() {
    console.log(JSON.stringify(
        {
            'ttsProviderName': ttsProviderName,
            'voiceMap': voiceMap,
            'audioPaused': audioPaused,
            'audioJobQueue': audioJobQueue,
            'currentAudioJob': currentAudioJob,
            'audioQueueProcessorReady': audioQueueProcessorReady,
            'ttsJobQueue': ttsJobQueue,
            'currentTtsJob': currentTtsJob,
            'ttsConfig': extension_settings.tts,
            'narratedMessageAudioKeys': Object.keys(narratedMessageAudio),
        },
    ));
}
window['debugTtsPlayback'] = debugTtsPlayback;


//##################//
//   Audio Control  //
//##################//

let audioElement = new Audio();
audioElement.id = 'tts_audio';
audioElement.autoplay = true;

/**
 * @type AudioJob[] Audio job queue
 * @typedef {{audioBlob: Blob | string, char: string, messageId: string | null}} AudioJob Audio job object
 */
let audioJobQueue = [];
/**
 * @type AudioJob Current audio job
 */
let currentAudioJob;
let audioPaused = false;
let audioQueueProcessorReady = true;


async function playAudioData(audioJob) {
    const { audioBlob, char } = audioJob;
    if (currentAudioJob == null) {
        console.log('Cancelled TTS playback because currentAudioJob was null');
        return;
    }
    if (audioBlob instanceof Blob) {
        if (audioJob.messageId) {
            narratedMessageAudio[audioJob.messageId] = audioBlob;
            addTtsControlsToMessage(audioJob.messageId);
        }

        const srcUrl = await getBase64Async(audioBlob);

        if (extension_settings.vrm?.enabled && typeof window['vrmLipSync'] === 'function') {
            await window['vrmLipSync'](audioBlob, char);
        }
        audioElement.src = srcUrl;
    } else if (typeof audioBlob === 'string') {
        audioElement.src = audioBlob;
    } else {
        throw `TTS received invalid audio data type ${typeof audioBlob}`;
    }
    audioElement.addEventListener('ended', completeCurrentAudioJob, { once: true });
    audioElement.addEventListener('canplay', () => {
        console.debug('Starting TTS playback');
        audioElement.playbackRate = extension_settings.tts.playback_rate;
        audioElement.play().catch(e => {
            console.error('Audio playback failed:', e);
            toastr.error('Audio playback failed. See console for details.');
            errorAudio.play();
            completeCurrentAudioJob();
        });
    }, { once: true });
}

window['tts_preview'] = function (id) {
    const audio = document.getElementById(id);

    if (audio instanceof HTMLAudioElement && !$(audio).data('disabled')) {
        audio.play();
    }
    else {
        ttsProvider.previewTtsVoice(id);
    }
};

async function onTtsVoicesClick() {
    let popupText = '';

    try {
        const voiceIds = await ttsProvider.fetchTtsVoiceObjects();

        for (const voice of voiceIds) {
            popupText += `
            <div class="voice_preview">
                <span class="voice_lang">${voice.lang || ''}</span>
                <b class="voice_name">${voice.name}</b>
                <i onclick="tts_preview('${voice.voice_id}')" class="fa-solid fa-play"></i>
            </div>`;
            if (voice.preview_url) {
                popupText += `<audio id="${voice.voice_id}" src="${voice.preview_url}" data-disabled="${voice.preview_url == false}"></audio>`;
            }
        }
    } catch {
        popupText = 'Could not load voices list. Check your API key.';
        errorAudio.play();
    }

    callGenericPopup(popupText, POPUP_TYPE.TEXT, '', { allowVerticalScrolling: true });
}

function updateUiAudioPlayState() {
    if (extension_settings.tts.enabled == true) {
        $('#ttsExtensionMenuItem').show();
        let img;
        if (!audioElement.paused || isTtsProcessing()) {
            img = 'fa-solid fa-stop-circle extensionsMenuExtensionButton';
        } else {
            img = 'fa-solid fa-circle-play extensionsMenuExtensionButton';
        }
        $('#tts_media_control').attr('class', img);
    } else {
        $('#ttsExtensionMenuItem').hide();
    }
}

function onAudioControlClicked() {
    audioElement.src = '/sounds/silence.mp3';
    let context = getContext();
    if (!audioElement.paused || isTtsProcessing()) {
        resetTtsPlayback();
    } else {
        const lastMessageIndex = context.chat.length - 1;
        processAndQueueTtsMessage(context.chat[lastMessageIndex], lastMessageIndex);
    }
    updateUiAudioPlayState();
}

function addAudioControl() {
    $('#tts_wand_container').append(`
        <div id="ttsExtensionMenuItem" class="list-group-item flex-container flexGap5">
            <div id="tts_media_control" class="extensionsMenuExtensionButton "/></div>
            TTS Playback
        </div>`);
    $('#tts_wand_container').append(`
        <div id="ttsExtensionNarrateAll" class="list-group-item flex-container flexGap5">
            <div class="extensionsMenuExtensionButton fa-solid fa-radio"></div>
            Narrate All Chat
        </div>`);
    $('#ttsExtensionMenuItem').attr('title', 'TTS play/pause').on('click', onAudioControlClicked);
    $('#ttsExtensionNarrateAll').attr('title', 'Narrate all messages in the current chat. Includes user messages, excludes hidden comments.').on('click', playFullConversation);
    updateUiAudioPlayState();
}

function completeCurrentAudioJob() {
    audioQueueProcessorReady = true;
    currentAudioJob = null;
    wrapper.update();
}


async function addAudioJob(response, char, messageId) {
    if (typeof response === 'string') {
        audioJobQueue.push({ audioBlob: response, char: char, messageId: messageId });
    } else {
        const audioData = await response.blob();
        if (!audioData.type.startsWith('audio/')) {
            throw `TTS received HTTP response with invalid data format. Expecting audio/*, got ${audioData.type}`;
        }
        audioJobQueue.push({ audioBlob: audioData, char: char, messageId: messageId });
    }
    console.debug('Pushed audio job to queue.');
}

async function processAudioJobQueue() {
    if (audioJobQueue.length == 0 || !audioQueueProcessorReady || audioPaused) {
        return;
    }
    try {
        audioQueueProcessorReady = false;
        currentAudioJob = audioJobQueue.shift();
        playAudioData(currentAudioJob);
    } catch (error) {
        toastr.error(error.toString());
        console.error(error);
        errorAudio.play();
        audioQueueProcessorReady = true;
    }
}

//################//
//  TTS Control   //
//################//

let ttsJobQueue = [];
let currentTtsJob;

function completeTtsJob() {
    console.info(`Current TTS job for ${currentTtsJob?.name} completed.`);
    removeTtsIndicators(currentTtsJob.id);
    currentTtsJob = null;
}

async function tts(text, voiceId, char, messageId) {
    async function processResponse(response) {
        if (typeof window['rvcVoiceConversion'] === 'function' && extension_settings.rvc.enabled) {
            response = await window['rvcVoiceConversion'](response, char, text);
        }
        await addAudioJob(response, char, messageId);
    }

    let response = await ttsProvider.generateTts(text, voiceId);

    if (typeof response[Symbol.asyncIterator] === 'function') {
        for await (const chunk of response) {
            await processResponse(chunk);
        }
    } else {
        await processResponse(response);
    }

    completeTtsJob();
}

async function processTtsQueue() {
    if (currentTtsJob || ttsJobQueue.length <= 0 || audioPaused) {
        return;
    }

    try {
        console.debug('New message found, running TTS');
        currentTtsJob = ttsJobQueue.shift();

        // Add timer UI
        if (currentTtsJob.id != null) {
            addTtsTimer(currentTtsJob.id);
        }

        let text = extension_settings.tts.narrate_translated_only ? (currentTtsJob?.extra?.display_text || currentTtsJob.mes) : currentTtsJob.mes;

        text = substituteParams(text);

        if (extension_settings.tts.skip_codeblocks) {
            text = text.replace(/^\s{4}.*$/gm, '').trim();
            text = text.replace(/```.*?```/gs, '').trim();
            text = text.replace(/~~~.*?~~~/gs, '').trim();
        }

        if (extension_settings.tts.skip_tags) {
            text = text.replace(/<.*?>[\s\S]*?<\/.*?>/g, '').trim();
        }

        if (!extension_settings.tts.pass_asterisks) {
            text = extension_settings.tts.narrate_dialogues_only
                ? text.replace(/\*[^*]*?(\*|$)/g, '').trim()
                : text.replaceAll('*', '').trim();
        }

        if (extension_settings.tts.narrate_quoted_only) {
            const special_quotes = /[“”«»「」『』＂＂]/g;
            text = text.replace(special_quotes, '"');
            const matches = text.match(/".*?"/g);
            const partJoiner = (ttsProvider?.separator || ' ... ');
            text = matches ? matches.join(partJoiner) : text;
        }

        text = text.replace(/!\[.*?]\([^)]*\)/g, '');

        if (typeof ttsProvider?.processText === 'function') {
            text = await ttsProvider.processText(text);
        }

        text = text.replace(/\s+/g, ' ').trim();

        console.log(`TTS: ${text}`);
        const char = currentTtsJob.name;
        const messageId = currentTtsJob.id;

        if (char && !power_user.allow_name2_display) {
            const escapedChar = escapeRegex(char);
            text = text.replace(new RegExp(`^${escapedChar}:`, 'gm'), '');
        }

        if (!text) {
            console.warn('Got empty text in TTS queue job.');
            completeTtsJob();
            return;
        }

        const voiceMapEntry = voiceMap[char] === DEFAULT_VOICE_MARKER ? voiceMap[DEFAULT_VOICE_MARKER] : voiceMap[char];

        if (!voiceMapEntry || voiceMapEntry === DISABLED_VOICE_MARKER) {
            throw `${char} not in voicemap. Configure character in extension settings voice map`;
        }
        const voice = await ttsProvider.getVoice(voiceMapEntry);
        const voiceId = voice.voice_id;
        if (voiceId == null) {
            toastr.error(`Specified voice for ${char} was not found. Check the TTS extension settings.`);
            throw `Unable to attain voiceId for ${char}`;
        }
        await tts(text, voiceId, char, messageId);

    } catch (error) {
        console.error(error);
        if (currentTtsJob && currentTtsJob.id != null) {
            addTtsErrorIcon(currentTtsJob.id, error.message);
        } else {
            toastr.error(error.message, "TTS Generation Failed");
        }
        errorAudio.play();
        currentTtsJob = null;
    }
}

async function playFullConversation() {
    resetTtsPlayback();

    if (!extension_settings.tts.enabled) {
        return toastr.warning('TTS is disabled. Please enable it in the extension settings.');
    }

    const context = getContext();
    const chat = context.chat.filter(x => !x.is_system && x.mes !== '...' && x.mes !== '');

    if (chat.length === 0) {
        return toastr.info('No messages to narrate.');
    }

    ttsJobQueue = chat.map((msg, index) => ({ ...msg, id: index }));
}

window['playFullConversation'] = playFullConversation;

//#############################//
//  Extension UI and Settings  //
//#############################//

function loadSettings() {
    if (Object.keys(extension_settings.tts).length === 0) {
        Object.assign(extension_settings.tts, defaultSettings);
    }
    for (const key in defaultSettings) {
        if (!(key in extension_settings.tts)) {
            extension_settings.tts[key] = defaultSettings[key];
        }
    }
    $('#tts_provider').val(extension_settings.tts.currentProvider);
    $('#tts_enabled').prop('checked', extension_settings.tts.enabled);
    $('#tts_narrate_dialogues').prop('checked', extension_settings.tts.narrate_dialogues_only);
    $('#tts_narrate_quoted').prop('checked', extension_settings.tts.narrate_quoted_only);
    $('#tts_auto_generation').prop('checked', extension_settings.tts.auto_generation);
    $('#tts_periodic_auto_generation').prop('checked', extension_settings.tts.periodic_auto_generation);
    $('#tts_narrate_by_paragraphs').prop('checked', extension_settings.tts.narrate_by_paragraphs);
    $('#tts_narrate_translated_only').prop('checked', extension_settings.tts.narrate_translated_only);
    $('#tts_narrate_user').prop('checked', extension_settings.tts.narrate_user);
    $('#tts_pass_asterisks').prop('checked', extension_settings.tts.pass_asterisks);
    $('#tts_skip_codeblocks').prop('checked', extension_settings.tts.skip_codeblocks);
    $('#tts_skip_tags').prop('checked', extension_settings.tts.skip_tags);
    $('#playback_rate').val(extension_settings.tts.playback_rate);
    $('#playback_rate_counter').val(Number(extension_settings.tts.playback_rate).toFixed(2));
    $('#playback_rate_block').toggle(extension_settings.tts.currentProvider !== 'System');

    $('body').toggleClass('tts', extension_settings.tts.enabled);
}

const defaultSettings = {
    voiceMap: '',
    ttsEnabled: false,
    currentProvider: 'ElevenLabs',
    auto_generation: true,
    narrate_user: false,
    playback_rate: 1,
};

function setTtsStatus(status, success) {
    $('#tts_status').text(status);
    if (success) {
        $('#tts_status').removeAttr('style');
    } else {
        $('#tts_status').css('color', 'red');
    }
}

function onRefreshClick() {
    Promise.all([
        ttsProvider.onRefreshClick(),
    ]).then(() => {
        extension_settings.tts[ttsProviderName] = ttsProvider.settings;
        saveSettingsDebounced();
        setTtsStatus('Successfully applied settings', true);
        console.info(`Saved settings ${ttsProviderName} ${JSON.stringify(ttsProvider.settings)}`);
        initVoiceMap();
        updateVoiceMap();
    }).catch(error => {
        toastr.error(error.toString());
        console.error(error);
        errorAudio.play();
        setTtsStatus(error, false);
    });
}

function onEnableClick() {
    extension_settings.tts.enabled = $('#tts_enabled').is(':checked');
    updateUiAudioPlayState();
    saveSettingsDebounced();
    $('body').toggleClass('tts', extension_settings.tts.enabled);
}

function onAutoGenerationClick() {
    extension_settings.tts.auto_generation = !!$('#tts_auto_generation').prop('checked');
    saveSettingsDebounced();
}

function onPeriodicAutoGenerationClick() {
    extension_settings.tts.periodic_auto_generation = !!$('#tts_periodic_auto_generation').prop('checked');
    saveSettingsDebounced();
}

function onNarrateByParagraphsClick() {
    extension_settings.tts.narrate_by_paragraphs = !!$('#tts_narrate_by_paragraphs').prop('checked');
    saveSettingsDebounced();
}

function onNarrateDialoguesClick() {
    extension_settings.tts.narrate_dialogues_only = !!$('#tts_narrate_dialogues').prop('checked');
    saveSettingsDebounced();
}

function onNarrateUserClick() {
    extension_settings.tts.narrate_user = !!$('#tts_narrate_user').prop('checked');
    saveSettingsDebounced();
}

function onNarrateQuotedClick() {
    extension_settings.tts.narrate_quoted_only = !!$('#tts_narrate_quoted_only').prop('checked');
    saveSettingsDebounced();
}

function onNarrateTranslatedOnlyClick() {
    extension_settings.tts.narrate_translated_only = !!$('#tts_narrate_translated_only').prop('checked');
    saveSettingsDebounced();
}

function onSkipCodeblocksClick() {
    extension_settings.tts.skip_codeblocks = !!$('#tts_skip_codeblocks').prop('checked');
    saveSettingsDebounced();
}

function onSkipTagsClick() {
    extension_settings.tts.skip_tags = !!$('#tts_skip_tags').prop('checked');
    saveSettingsDebounced();
}

function onPassAsterisksClick() {
    extension_settings.tts.pass_asterisks = !!$('#tts_pass_asterisks').prop('checked');
    saveSettingsDebounced();
}

//##############//
// TTS Provider //
//##############//

async function loadTtsProvider(provider) {
    $('#tts_provider_settings').html('');
    if (!provider) return;

    extension_settings.tts.currentProvider = provider;
    ttsProviderName = provider;
    ttsProvider = new ttsProviders[provider]();

    $('#tts_provider_settings').append(ttsProvider.settingsHtml);
    if (!(ttsProviderName in extension_settings.tts)) {
        extension_settings.tts[ttsProviderName] = {};
    }
    await ttsProvider.loadSettings(extension_settings.tts[ttsProviderName]);
    await initVoiceMap();
}

function onTtsProviderChange() {
    if (typeof ttsProvider?.dispose === 'function') {
        ttsProvider.dispose();
    }
    const ttsProviderSelection = $('#tts_provider').val();
    extension_settings.tts.currentProvider = ttsProviderSelection;
    $('#playback_rate_block').toggle(extension_settings.tts.currentProvider !== 'System');
    loadTtsProvider(ttsProviderSelection);
}

export function saveTtsProviderSettings() {
    extension_settings.tts[ttsProviderName] = ttsProvider.settings;
    updateVoiceMap();
    saveSettingsDebounced();
    console.info(`Saved settings ${ttsProviderName} ${JSON.stringify(ttsProvider.settings)}`);
}

//###################//
// voiceMap Handling //
//###################//

async function onChatChanged() {
    await onGenerationEnded();
    resetTtsPlayback();
    Object.keys(narratedMessageAudio).forEach(key => delete narratedMessageAudio[key]);
    const voiceMapInit = initVoiceMap();
    await Promise.race([voiceMapInit, delay(debounce_timeout.relaxed)]);
    lastMessage = null;
}

async function onMessageEvent(messageId, lastCharIndex) {
    if (!extension_settings.tts.enabled || !extension_settings.tts.auto_generation) return;
    const context = getContext();
    if (!context.groupId && context.characterId === undefined) return;
    if (context.chatId !== lastChatId) {
        lastChatId = context.chatId;
        lastMessageHash = getStringHash(context.chat[messageId]?.mes ?? '');
        if (context.chat.length === 1) lastMessageHash = -1;
    }
    const message = structuredClone(context.chat[messageId]);
    const hashNew = getStringHash(message?.mes ?? '');
    if (message.is_system || hashNew === lastMessageHash) return;
    if (lastCharIndex) message.mes = message.mes.substring(0, lastCharIndex);
    const isLastMessageInCurrent = () => lastMessage && typeof lastMessage === 'object' && message.swipe_id === lastMessage.swipe_id && message.name === lastMessage.name && message.is_user === lastMessage.is_user && message.mes.indexOf(lastMessage.mes) !== -1;
    if (isLastMessageInCurrent()) {
        const tmp = structuredClone(message);
        message.mes = message.mes.replace(lastMessage.mes, '');
        lastMessage = tmp;
    } else {
        lastMessage = structuredClone(message);
    }
    if (!message || message.mes === '...' || message.mes === '') return;
    if (extension_settings.tts.narrate_translated_only && !(message?.extra?.display_text)) return;
    if (message.is_user && !extension_settings.tts.narrate_user) return;
    lastMessageHash = hashNew;
    lastChatId = context.chatId;
    console.debug(`Adding message from ${message.name} for TTS processing: "${message.mes}"`);
    if (extension_settings.tts.periodic_auto_generation) {
        ttsJobQueue.push({ ...message, id: messageId });
    } else {
        processAndQueueTtsMessage(message, messageId);
    }
}


async function onMessageDeleted() {
    const context = getContext();
    lastChatId = context.chatId;
    const messageHash = getStringHash((context.chat.length && context.chat[context.chat.length - 1].mes) ?? '');
    if (messageHash === lastMessageHash) return;
    const deletedMessageId = Object.keys(narratedMessageAudio).find(id => !context.chat[id]);
    if (deletedMessageId) {
        delete narratedMessageAudio[deletedMessageId];
    }
    lastMessageHash = messageHash;
    lastMessage = context.chat.length ? structuredClone(context.chat[context.chat.length - 1]) : null;
    resetTtsPlayback();
}

async function onGenerationStarted(generationType, _args, isDryRun) {
    if (isDryRun || ['quiet', 'impersonate'].includes(generationType)) return;
    if (!extension_settings.tts.enabled || !extension_settings.tts.auto_generation || !extension_settings.tts.periodic_auto_generation || !isStreamingEnabled()) return;
    if (!periodicMessageGenerationTimer) {
        periodicMessageGenerationTimer = setInterval(onPeriodicMessageGenerationTick, UPDATE_INTERVAL);
    }
}

async function onGenerationEnded() {
    if (periodicMessageGenerationTimer) {
        clearInterval(periodicMessageGenerationTimer);
        periodicMessageGenerationTimer = null;
    }
    lastPositionOfParagraphEnd = -1;
}

async function onPeriodicMessageGenerationTick() {
    const context = getContext();
    if (!context.groupId && context.characterId === undefined) return;
    const lastMessageId = context.chat.length - 1;
    if (context.chat[lastMessageId].is_user) return;
    const lastMessage = structuredClone(context.chat[lastMessageId]);
    const lastMessageText = lastMessage?.mes ?? '';
    let newLastPositionOfParagraphEnd = lastMessageText.indexOf('\n\n', lastPositionOfParagraphEnd + 1);
    if (newLastPositionOfParagraphEnd === -1) {
        newLastPositionOfParagraphEnd = lastMessageText.indexOf('\n', lastPositionOfParagraphEnd + 1);
    }
    if (newLastPositionOfParagraphEnd > -1) {
        onMessageEvent(lastMessageId, newLastPositionOfParagraphEnd);
        if (periodicMessageGenerationTimer) {
            lastPositionOfParagraphEnd = newLastPositionOfParagraphEnd;
        }
    }
}

function getCharacters(unrestricted) {
    const context = getContext();
    if (unrestricted) {
        const names = context.characters.map(char => char.name);
        names.unshift(DEFAULT_VOICE_MARKER);
        return names.filter(onlyUnique);
    }
    let characters = [];
    if (context.groupId === null) {
        characters.push(DEFAULT_VOICE_MARKER, context.name1, context.name2);
    } else {
        characters.push(DEFAULT_VOICE_MARKER, context.name1);
        const group = context.groups.find(group => context.groupId == group.id);
        for (let member of group.members) {
            const character = context.characters.find(char => char.avatar == member);
            if (character) characters.push(character.name);
        }
    }
    return characters.filter(onlyUnique);
}

function sanitizeId(input) {
    let sanitized = encodeURIComponent(input).replace(/[^a-zA-Z0-9-_]/g, '');
    if (!/^[a-zA-Z]/.test(sanitized)) sanitized = 'element_' + sanitized;
    return sanitized;
}

function parseVoiceMap(voiceMapString) {
    let parsedVoiceMap = {};
    for (const [charName, voiceId] of voiceMapString.split(',').map(s => s.split(':'))) {
        if (charName && voiceId) parsedVoiceMap[charName.trim()] = voiceId.trim();
    }
    return parsedVoiceMap;
}

function updateVoiceMap() {
    const tempVoiceMap = {};
    for (const voice of voiceMapEntries) {
        if (voice.voiceId === null) continue;
        tempVoiceMap[voice.name] = voice.voiceId;
    }
    if (Object.keys(tempVoiceMap).length !== 0) {
        voiceMap = tempVoiceMap;
        console.log(`Voicemap updated to ${JSON.stringify(voiceMap)}`);
    }
    if (!extension_settings.tts[ttsProviderName].voiceMap) {
        extension_settings.tts[ttsProviderName].voiceMap = {};
    }
    Object.assign(extension_settings.tts[ttsProviderName].voiceMap, voiceMap);
    saveSettingsDebounced();
}

class VoiceMapEntry {
    name; voiceId; selectElement;
    constructor(name, voiceId = DEFAULT_VOICE_MARKER) {
        this.name = name; this.voiceId = voiceId; this.selectElement = null;
    }
    addUI(voiceIds) {
        let sanitizedName = sanitizeId(this.name);
        let defaultOption = this.name === DEFAULT_VOICE_MARKER ? `<option>${DISABLED_VOICE_MARKER}</option>` : `<option>${DEFAULT_VOICE_MARKER}</option><option>${DISABLED_VOICE_MARKER}</option>`;
        let template = `<div class='tts_voicemap_block_char flex-container flexGap5'><span id='tts_voicemap_char_${sanitizedName}'>${this.name}</span><select id='tts_voicemap_char_${sanitizedName}_voice'>${defaultOption}</select></div>`;
        $('#tts_voicemap_block').append(template);
        for (const voiceId of voiceIds) {
            const option = document.createElement('option');
            option.innerText = voiceId.name; option.value = voiceId.name;
            $(`#tts_voicemap_char_${sanitizedName}_voice`).append(option);
        }
        this.selectElement = $(`#tts_voicemap_char_${sanitizedName}_voice`);
        this.selectElement.on('change', args => this.onSelectChange(args));
        this.selectElement.val(this.voiceId);
    }
    onSelectChange(args) { this.voiceId = this.selectElement.find(':selected').val(); updateVoiceMap(); }
}

export async function initVoiceMap(unrestricted = false) {
    if (currentInitVoiceMapPromise) return currentInitVoiceMapPromise;
    currentInitVoiceMapPromise = (async () => {
        const initialChatId = getCurrentChatId();
        try { await initVoiceMapInternal(unrestricted); } finally { currentInitVoiceMapPromise = null; }
        const currentChatId = getCurrentChatId();
        if (initialChatId !== currentChatId) await initVoiceMap(unrestricted);
    })();
    return currentInitVoiceMapPromise;
}

async function initVoiceMapInternal(unrestricted) {
    const enabled = $('#tts_enabled').is(':checked');
    if (!enabled) return;
    try { await ttsProvider.checkReady(); } catch (error) {
        const message = `TTS Provider not ready. ${error}`;
        setTtsStatus(message, false); return;
    }
    setTtsStatus('TTS Provider Loaded', true);
    $('#tts_voicemap_block').empty(); voiceMapEntries = [];
    const characters = getCharacters(unrestricted);
    let voiceMapFromSettings = {};
    if ('voiceMap' in extension_settings.tts[ttsProviderName]) {
        if (typeof extension_settings.tts[ttsProviderName].voiceMap === 'string') voiceMapFromSettings = parseVoiceMap(extension_settings.tts[ttsProviderName].voiceMap);
        else if (typeof extension_settings.tts[ttsProviderName].voiceMap === 'object') voiceMapFromSettings = extension_settings.tts[ttsProviderName].voiceMap;
    }
    let voiceIdsFromProvider;
    try { voiceIdsFromProvider = await ttsProvider.fetchTtsVoiceObjects(); } catch { toastr.error('TTS Provider failed to return voice ids.'); }
    for (const character of characters) {
        if (character === 'SillyTavern System') continue;
        let voiceId;
        if (character in voiceMapFromSettings) voiceId = voiceMapFromSettings[character];
        else if (character === DEFAULT_VOICE_MARKER) voiceId = DISABLED_VOICE_MARKER;
        else voiceId = DEFAULT_VOICE_MARKER;
        const voiceMapEntry = new VoiceMapEntry(character, voiceId);
        voiceMapEntry.addUI(voiceIdsFromProvider); voiceMapEntries.push(voiceMapEntry);
    }
    updateVoiceMap();
}

jQuery(async function () {
    const ttsIndicatorStyles = `
        <style>
            .tts-timer-indicator, .tts-error-indicator {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                opacity: 0.7;
            }
        </style>
    `;
    $('body').append(ttsIndicatorStyles);

    async function addExtensionControls() {
        const settingsHtml = $(await renderExtensionTemplateAsync('tts', 'settings'));
        $('#tts_container').append(settingsHtml);
        $('#tts_refresh').on('click', onRefreshClick);
        $('#tts_enabled').on('click', onEnableClick);
        $('#tts_narrate_dialogues').on('click', onNarrateDialoguesClick);
        $('#tts_narrate_quoted').on('click', onNarrateQuotedClick);
        $('#tts_narrate_translated_only').on('click', onNarrateTranslatedOnlyClick);
        $('#tts_skip_codeblocks').on('click', onSkipCodeblocksClick);
        $('#tts_skip_tags').on('click', onSkipTagsClick);
        $('#tts_pass_asterisks').on('click', onPassAsterisksClick);
        $('#tts_auto_generation').on('click', onAutoGenerationClick);
        $('#tts_periodic_auto_generation').on('click', onPeriodicAutoGenerationClick);
        $('#tts_narrate_by_paragraphs').on('click', onNarrateByParagraphsClick);
        $('#tts_narrate_user').on('click', onNarrateUserClick);
        $('#playback_rate').on('input', function () {
            const value = $(this).val();
            extension_settings.tts.playback_rate = value;
            $('#playback_rate_counter').val(Number(value).toFixed(2));
            saveSettingsDebounced();
        });
        $('#tts_voices').on('click', onTtsVoicesClick);
        for (const provider in ttsProviders) {
            $('#tts_provider').append($('<option />').val(provider).text(provider));
        }
        $('#tts_provider').on('change', onTtsProviderChange);
        $(document).on('click', '.mes_narrate', onNarrateOneMessage);

        $(document).on('click', '.mes_replay_tts', onTtsReplayClick);
        $(document).on('click', '.mes_download_tts', onTtsDownloadClick);
    }
    await addExtensionControls();
    loadSettings();
    loadTtsProvider(extension_settings.tts.currentProvider);
    addAudioControl();
    setInterval(wrapper.update.bind(wrapper), UPDATE_INTERVAL);
    eventSource.on(event_types.MESSAGE_SWIPED, resetTtsPlayback);
    eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
    eventSource.on(event_types.MESSAGE_DELETED, onMessageDeleted);
    eventSource.on(event_types.GROUP_UPDATED, onChatChanged);
    eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(event_types.GENERATION_ENDED, onGenerationEnded);
    eventSource.makeLast(event_types.CHARACTER_MESSAGE_RENDERED, (messageId) => onMessageEvent(messageId));
    eventSource.makeLast(event_types.USER_MESSAGE_RENDERED, (messageId) => onMessageEvent(messageId));
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'speak',
        callback: async (args, value) => { await onNarrateText(args, value); return ''; },
        aliases: ['narrate', 'tts'],
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'voice',
                description: 'character voice name',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
                enumProvider: () => Object.keys(voiceMap).map(voiceName => new SlashCommandEnumValue(voiceName, null, enumTypes.enum, enumIcons.voice)),
            }),
        ],
        unnamedArgumentList: [new SlashCommandArgument('text', [ARGUMENT_TYPE.STRING], true)],
        helpString: '<div>Narrate any text using currently selected character\'s voice.</div><div>Use <code>voice="Character Name"</code> argument to set other voice from the voice map.</div><div><strong>Example:</strong><ul><li><pre><code>/speak voice="Donald Duck" Quack!</code></pre></li></ul></div>',
    }));
    document.body.appendChild(audioElement);
    document.body.appendChild(errorAudio);
});