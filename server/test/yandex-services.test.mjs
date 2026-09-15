import test from 'node:test';
import assert from 'node:assert/strict';
import { createLLMAdapter } from '../dist/llm/adapter.js';
import { SpeechKitClient } from '../dist/speech/client.js';

const config = {
  llmProvider: 'yandex-ai-studio', llmBaseUrl: 'https://ai.api.cloud.yandex.net/v1',
  llmModel: 'gpt://folder/qwen-test/latest', llmApiKey: 'test-key', llmMaxTokens: 321,
  llmTemperature: 0.25, experimentVersion: 'test-v1', systemPromptVersion: 'prompt-v1',
  yandexApiKey: 'test-key', speechkitSttModel: 'general', speechkitTtsVoice: 'marina',
};

test('AI Studio adapter uses centralized model and generation parameters', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://ai.api.cloud.yandex.net/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(init.body);
    assert.equal(body.model, config.llmModel);
    assert.equal(body.max_tokens, 321);
    assert.equal(body.temperature, 0.25);
    return Response.json({ choices: [{ message: { content: 'Подсказка' } }], model: config.llmModel,
      usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 } });
  };
  const result = await createLLMAdapter(config).chat({ messages: [{ role: 'user', content: 'Вопрос' }] });
  assert.equal(result.content, 'Подсказка');
  assert.equal(result.retryCount, 0);
});

test('SpeechKit STT sends PCM without retaining audio', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /format=lpcm/);
    assert.match(String(url), /sampleRateHertz=16000/);
    assert.equal(init.headers.Authorization, 'Api-Key test-key');
    return Response.json({ result: 'текст вопроса' });
  };
  assert.equal(await new SpeechKitClient(config).recognizePcm(Buffer.from([0, 0]), 16000), 'текст вопроса');
});
