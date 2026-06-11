let recognition: any = null;
let isContinuousListening = false;
let onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
let onErrorCallback: ((error: string) => void) | null = null;

export function initSpeechRecognition(
  onResult: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void
) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('Распознавание речи не поддерживается в этом браузере. Используйте Chrome.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true; // We want partial results for UI
  recognition.maxAlternatives = 1;
  recognition.continuous = true;     // Always listen

  onResultCallback = onResult;
  onErrorCallback = onError;

  recognition.onresult = (event: any) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript && onResultCallback) {
      onResultCallback(finalTranscript, true);
    } else if (interimTranscript && onResultCallback) {
      onResultCallback(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    // Ignore no-speech, it's normal in continuous mode
    if (event.error === 'no-speech') return;
    
    if (event.error === 'not-allowed') {
      if (onErrorCallback) onErrorCallback('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.');
      isContinuousListening = false;
    } else {
      console.warn(`STT Error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    // Auto-restart if we didn't explicitly stop it or pause it
    if (isContinuousListening && !isPaused && recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to restart recognition', e);
      }
    }
  };
}

let isPaused = false;

export function pauseContinuousListening() {
  isPaused = true;
  if (recognition) recognition.stop();
}

export function resumeContinuousListening() {
  isPaused = false;
  if (isContinuousListening && recognition) {
    try {
      recognition.start();
    } catch (e) {
      // Already started
    }
  }
}

export function startContinuousListening() {
  if (!recognition) return;
  isContinuousListening = true;
  isPaused = false;
  try {
    recognition.start();
  } catch (e) {
    // Already started
  }
}

export function stopContinuousListening() {
  isContinuousListening = false;
  isPaused = false;
  if (recognition) {
    recognition.stop();
  }
}

export function isListeningActive(): boolean {
  return isContinuousListening && !isPaused;
}
