export type Provider = 'gemini' | 'claude' | 'openai' | 'custom';

export interface LLMConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string; // 自定义/兼容接口用
}

const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: 'gemini-3.5-flash',
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-5.5',
  custom: 'deepseek-v4-flash',
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Google Gemini',
  claude: 'Anthropic Claude',
  openai: 'OpenAI',
  custom: '自定义（OpenAI 兼容）',
};

let _config: LLMConfig | null = null;

export function initLLM(config: LLMConfig) {
  _config = { ...config };
  if (!_config.model) _config.model = DEFAULT_MODELS[config.provider];
  saveLLMConfig(config);
}

export function getConfig(): LLMConfig | null { return _config; }

export function saveLLMConfig(config: LLMConfig) {
  localStorage.setItem('ln_llm_config', JSON.stringify(config));
}

export function loadLLMConfig(): LLMConfig | null {
  try {
    const raw = localStorage.getItem('ln_llm_config');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// HTTP 头只支持 ISO-8859-1，去掉所有非 Latin-1 字符
function safeHeader(val: string): string {
  return val.replace(/[^\x00-\xFF]/g, '').trim();
}

export async function gen(prompt: string, maxTokens = 4096): Promise<string> {
  if (!_config) throw new Error('请先配置 AI API');
  const { provider, model, baseUrl } = _config;
  const apiKey = safeHeader(_config.apiKey);
  const safeModel = _config.model.trim();

  if (!apiKey) throw new Error('API Key 含有非法字符，请重新输入');

  switch (provider) {
    case 'gemini':
      return genGemini(prompt, apiKey, safeModel);
    case 'claude':
      return genClaude(prompt, apiKey, safeModel, maxTokens);
    case 'openai':
    case 'custom':
      return genOpenAI(prompt, apiKey, safeModel, maxTokens, baseUrl);
  }
}

// ─── Gemini ──────────────────────────────────────────────────

async function genGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini 错误：${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Claude ──────────────────────────────────────────────────

async function genClaude(prompt: string, apiKey: string, model: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude 错误：${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

// ─── OpenAI / 兼容接口 ───────────────────────────────────────

async function genOpenAI(
  prompt: string, apiKey: string, model: string,
  maxTokens: number, baseUrl?: string
): Promise<string> {
  const url = (baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1') + '/chat/completions';
  const isGpt5 = /^gpt-5/.test(model);
  const isOReasoning = /^o\d/.test(model);
  const body: Record<string, unknown> = { model, messages: [{ role: 'user', content: prompt }] };
  if (isGpt5) {
    // 关闭推理：写作/JSON 任务无需思维链，且推理 token 会与正文共用额度，吃满后导致正文为空（尤其日文长正文）。
    // 设远超单章所需的高上限：模型写完会自然 stop，触不到上限，等价于不限制正文长度，
    // 又避免"无上限"导致单次请求输出超长、耗时过久而 fetch 中断。
    body.reasoning_effort = 'none';
    body.max_completion_tokens = maxTokens;
  } else if (isOReasoning) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
    body.temperature = 0.8;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`API 错误：${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
