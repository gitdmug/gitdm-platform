/**
 * Multi-provider LLM cascade for GITDM Assistant + Market Insights.
 * Order: Groq → Together.ai → OpenRouter → OpenAI → Gemini → (caller handles data-derived).
 * All providers use OpenAI-compatible chat completions where possible.
 * Free/low-cost keys only; never exposes secrets.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | any[] };

export type AiResult = {
  text: string;
  provider: string;
  model?: string;
  error?: string;
};

function present(key?: string | null) {
  return Boolean(key && String(key).trim().length > 8);
}

type ProviderConfig = {
  id: string;
  envKey: string;
  baseUrl: string;
  defaultModel: string;
  modelEnv?: string;
  authHeader?: (key: string) => Record<string, string>;
  buildBody?: (model: string, messages: ChatMessage[], maxTokens: number) => any;
  extract?: (json: any) => string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    envKey: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    modelEnv: "GROQ_MODEL",
  },
  {
    id: "together",
    envKey: "TOGETHER_API_KEY",
    baseUrl: "https://api.together.xyz/v1/chat/completions",
    defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    modelEnv: "TOGETHER_MODEL",
  },
  {
    id: "openrouter",
    envKey: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "meta-llama/llama-3.1-70b-instruct",
    modelEnv: "OPENROUTER_MODEL",
    authHeader: (key) => ({
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://globalinstituteoftrading.com",
      "X-Title": "GITDM Market Insights",
    }),
  },
  {
    id: "openai",
    envKey: "OPENAI_API_KEY",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions",
    defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    modelEnv: "OPENAI_MODEL",
  },
];

async function callOpenAiCompatible(
  cfg: ProviderConfig,
  key: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<AiResult> {
  const model = (cfg.modelEnv && process.env[cfg.modelEnv]) || cfg.defaultModel;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cfg.authHeader ? cfg.authHeader(key) : { Authorization: `Bearer ${key}` }),
  };
  const body = cfg.buildBody
    ? cfg.buildBody(model, messages, maxTokens)
    : {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

  const response = await fetch(cfg.baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = json?.error?.message || json?.error || `HTTP ${response.status}`;
    return { text: "", provider: cfg.id, error: String(msg).slice(0, 160) };
  }
  const text =
    (cfg.extract ? cfg.extract(json) : json.choices?.[0]?.message?.content) || "";
  return { text: String(text), provider: cfg.id, model };
}

async function callGemini(
  key: string,
  systemText: string,
  userText: string,
  imageBase64?: { mime: string; data: string }
): Promise<AiResult> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const parts: any[] = [{ text: userText }];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: imageBase64.mime, data: imageBase64.data } });
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2400 },
      }),
      signal: AbortSignal.timeout(45000),
    }
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { text: "", provider: "gemini", error: `HTTP ${response.status}` };
  }
  const text =
    json.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n") || "";
  return { text, provider: "gemini", model };
}

/**
 * Cascade through configured free/paid providers. Returns first successful non-empty text.
 */
export async function generateWithCascade(opts: {
  system: string;
  user: string | any[];
  maxTokens?: number;
  temperature?: number;
  imageBase64?: { mime: string; data: string };
}): Promise<AiResult & { keysDetected: Record<string, boolean> }> {
  const maxTokens = opts.maxTokens ?? 2200;
  const temperature = opts.temperature ?? 0.2;
  const keysDetected: Record<string, boolean> = {
    groq: present(process.env.GROQ_API_KEY),
    together: present(process.env.TOGETHER_API_KEY),
    openrouter: present(process.env.OPENROUTER_API_KEY),
    openai: present(process.env.OPENAI_API_KEY),
    gemini: present(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY),
  };

  const messages: ChatMessage[] = [
    { role: "system", content: opts.system },
    {
      role: "user",
      content: Array.isArray(opts.user)
        ? opts.user
        : opts.imageBase64
          ? [
              { type: "text", text: typeof opts.user === "string" ? opts.user : String(opts.user) },
              {
                type: "image_url",
                image_url: {
                  url: `data:${opts.imageBase64.mime};base64,${opts.imageBase64.data}`,
                },
              },
            ]
          : opts.user,
    },
  ];

  const errors: string[] = [];

  for (const cfg of PROVIDERS) {
    const key = (process.env[cfg.envKey] || "").trim();
    if (!present(key)) continue;
    try {
      const result = await callOpenAiCompatible(cfg, key, messages, maxTokens, temperature);
      if (result.text && result.text.trim()) return { ...result, keysDetected };
      if (result.error) errors.push(`${cfg.id}: ${result.error}`);
    } catch (e) {
      errors.push(`${cfg.id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  // Gemini last among LLMs (different API shape)
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "").trim();
  if (present(geminiKey)) {
    try {
      const userText = typeof opts.user === "string" ? opts.user : JSON.stringify(opts.user);
      const result = await callGemini(geminiKey, opts.system, userText, opts.imageBase64);
      if (result.text && result.text.trim()) return { ...result, keysDetected };
      if (result.error) errors.push(`gemini: ${result.error}`);
    } catch (e) {
      errors.push(`gemini: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return {
    text: "",
    provider: "none",
    error: errors.length ? errors.join("; ") : "No AI provider keys configured",
    keysDetected,
  };
}

export function keysPresentSummary() {
  return {
    groq: present(process.env.GROQ_API_KEY),
    together: present(process.env.TOGETHER_API_KEY),
    openrouter: present(process.env.OPENROUTER_API_KEY),
    openai: present(process.env.OPENAI_API_KEY),
    gemini: present(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY),
  };
}
