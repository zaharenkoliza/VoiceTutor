import type { ServerConfig } from '../config.js';

const STT_URL = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';
const TTS_URL = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';
const TIMEOUT_MS = 30_000;

export class SpeechKitClient {
  constructor(private readonly config: ServerConfig) {}

  async recognizePcm(audio: Buffer, sampleRate: number): Promise<string> {
    const url = new URL(STT_URL);
    url.searchParams.set('lang', 'ru-RU');
    url.searchParams.set('format', 'lpcm');
    url.searchParams.set('sampleRateHertz', String(sampleRate));
    url.searchParams.set('model', this.config.speechkitSttModel);
    const response = await fetch(url, {
      method: 'POST', headers: { Authorization: `Api-Key ${this.config.yandexApiKey}` },
      body: new Uint8Array(audio) as BodyInit, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`SpeechKit STT returned ${response.status}`);
    const result = await response.json() as { result?: string };
    if (typeof result.result !== 'string' || !result.result.trim()) throw new Error('SpeechKit STT returned an empty transcript');
    return result.result.trim();
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const body = new URLSearchParams({ text, lang: 'ru-RU', voice: this.config.speechkitTtsVoice, format: 'oggopus' });
    const response = await fetch(TTS_URL, {
      method: 'POST', headers: { Authorization: `Api-Key ${this.config.yandexApiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded' },
      body, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`SpeechKit TTS returned ${response.status}`);
    return response.arrayBuffer();
  }
}
