type SpeakingCallback = (isSpeaking: boolean) => void;

const listeners: Set<SpeakingCallback> = new Set();

/**
 * Subscribe to speaking state changes.
 * Returns an unsubscribe function.
 */
export function onSpeakingChange(callback: SpeakingCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(speaking: boolean): void {
  for (const cb of listeners) {
    cb(speaking);
  }
}

/** Check if TTS is currently speaking */
export function isSpeaking(): boolean {
  return window.speechSynthesis.speaking;
}

/** Stop any ongoing speech */
export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
  notifyListeners(false);
}

/**
 * Speak the given text using Web Speech API SpeechSynthesis.
 * Language: ru-RU.
 * Returns a promise that resolves when speech ends.
 */
export function speak(text: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Cancel any ongoing speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Try to find a Russian voice
    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find((v) => v.lang.startsWith('ru'));
    if (ruVoice) {
      utterance.voice = ruVoice;
    }

    utterance.onstart = () => {
      notifyListeners(true);
    };

    utterance.onend = () => {
      notifyListeners(false);
      resolve();
    };

    utterance.onerror = (event) => {
      notifyListeners(false);
      // 'interrupted' and 'canceled' are not real errors
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve();
      } else {
        reject(new Error(`TTS ошибка: ${event.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}
