const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error('VITE_API_URL must be set at build time');

export interface PcmRecording {
  stop(): Promise<{ pcm: ArrayBuffer; sampleRate: 16000; durationMs: number }>;
}

export async function startPcmRecording(): Promise<PcmRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const started = performance.now();
  processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  source.connect(processor);
  processor.connect(context.destination);
  return {
    async stop() {
      processor.disconnect(); source.disconnect(); stream.getTracks().forEach((track) => track.stop());
      await context.close();
      const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const input = new Float32Array(length);
      let offset = 0;
      for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length; }
      const ratio = context.sampleRate / 16000;
      const outputLength = Math.floor(input.length / ratio);
      const pcm = new ArrayBuffer(outputLength * 2);
      const view = new DataView(pcm);
      for (let i = 0; i < outputLength; i++) {
        const sample = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)] ?? 0));
        view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }
      return { pcm, sampleRate: 16000, durationMs: performance.now() - started };
    },
  };
}

function authHeaders(participantId: string, authToken: string): Record<string, string> {
  return { Authorization: `Bearer ${participantId}:${authToken}` };
}

export async function transcribePcm(pcm: ArrayBuffer, sampleRate: number, participantId: string, authToken: string) {
  const response = await fetch(`${API_URL}/api/speech/stt`, { method: 'POST',
    headers: { ...authHeaders(participantId, authToken), 'Content-Type': 'application/octet-stream',
      'x-audio-sample-rate': String(sampleRate) }, body: pcm });
  if (!response.ok) throw new Error('Не удалось распознать речь. Повторите попытку.');
  return (await response.json() as { transcript: string }).transcript;
}

export async function synthesizeSpeech(text: string, participantId: string, authToken: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/speech/tts`, { method: 'POST',
    headers: { ...authHeaders(participantId, authToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }) });
  if (!response.ok) throw new Error('Не удалось озвучить ответ. Текст ответа сохранён на экране.');
  return response.blob();
}

export async function playAudio(blob: Blob, onStart: () => void, onEnd: () => void): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onplay = onStart;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => { onEnd(); resolve(); };
    audio.onerror = () => reject(new Error('Не удалось воспроизвести аудио'));
    void audio.play().catch(reject);
  }).finally(() => URL.revokeObjectURL(url));
}
