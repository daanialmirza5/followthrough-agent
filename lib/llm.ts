import Groq from "groq-sdk";
import { z } from "zod";

export const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

export function hasKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

let client: Groq | null = null;
export function getClient() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

type Effort = "low" | "medium" | "high";

/**
 * One structured call. The JSON schema (generated from Zod) goes in the system prompt,
 * the model runs in JSON mode, and the output is validated with Zod. If validation
 * fails, the errors are sent back once for self-repair.
 */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: S;
  effort?: Effort;
}): Promise<z.infer<S>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const system = `${opts.system}

Respond with ONLY a JSON object that conforms exactly to this JSON Schema (all listed properties are required; use null where allowed and nothing applies):
${jsonSchema}`;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: opts.user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await getClient().chat.completions.create({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 8192,
      ...(MODEL.startsWith("openai/gpt-oss") ? { reasoning_effort: opts.effort ?? "medium" } : {}),
    });
    const content = res.choices[0]?.message?.content ?? "";
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      messages.push({ role: "assistant", content }, { role: "user", content: "That was not valid JSON. Return only the JSON object." });
      continue;
    }
    const parsed = opts.schema.safeParse(data);
    if (parsed.success) return parsed.data as z.infer<S>;
    messages.push(
      { role: "assistant", content },
      { role: "user", content: `The JSON did not match the schema. Fix these issues and return the full corrected JSON object only:\n${parsed.error.message}` }
    );
  }
  throw new Error("The model returned malformed output twice. Please retry.");
}

export function errorMessage(e: unknown): string {
  if (e instanceof Groq.AuthenticationError) return "Invalid GROQ_API_KEY.";
  if (e instanceof Groq.RateLimitError) return "Rate limited by Groq. Retry in a few seconds.";
  if (e instanceof Groq.APIError) return `Groq API error ${e.status}: ${e.message}`;
  if (e instanceof Error) return e.message;
  return "Unknown error";
}
