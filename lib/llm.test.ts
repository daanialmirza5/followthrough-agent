import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const create = vi.fn();

vi.mock("groq-sdk", () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class Groq {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    chat = { completions: { create } };
  }
  return { default: Groq };
});

const { structured, errorMessage } = await import("./llm");
const Groq = (await import("groq-sdk")).default as unknown as {
  APIError: new (s: number, m: string) => Error;
  AuthenticationError: new (s: number, m: string) => Error;
  RateLimitError: new (s: number, m: string) => Error;
};

const Schema = z.object({ answer: z.number() });
const reply = (content: string) => ({ choices: [{ message: { content } }] });

describe("structured", () => {
  beforeEach(() => create.mockReset());

  it("returns validated output on the first valid answer", async () => {
    create.mockResolvedValueOnce(reply('{"answer": 42}'));
    await expect(structured({ system: "s", user: "u", schema: Schema })).resolves.toEqual({ answer: 42 });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("puts the JSON schema in the system prompt and requests JSON mode", async () => {
    create.mockResolvedValueOnce(reply('{"answer": 1}'));
    await structured({ system: "SYSTEM", user: "u", schema: Schema });
    const call = create.mock.calls[0][0];
    expect(call.response_format).toEqual({ type: "json_object" });
    expect(call.messages[0].content).toContain('"answer"');
  });

  it("asks the model to repair invalid JSON once", async () => {
    create.mockResolvedValueOnce(reply("not json")).mockResolvedValueOnce(reply('{"answer": 7}'));
    await expect(structured({ system: "s", user: "u", schema: Schema })).resolves.toEqual({ answer: 7 });
    const repair = create.mock.calls[1][0].messages.at(-1);
    expect(repair.content).toMatch(/not valid JSON/);
  });

  it("sends schema errors back for self-repair", async () => {
    create.mockResolvedValueOnce(reply('{"answer": "seven"}')).mockResolvedValueOnce(reply('{"answer": 7}'));
    await expect(structured({ system: "s", user: "u", schema: Schema })).resolves.toEqual({ answer: 7 });
    expect(create.mock.calls[1][0].messages.at(-1).content).toMatch(/did not match the schema/);
  });

  it("gives up after two malformed answers instead of returning unvalidated data", async () => {
    create.mockResolvedValue(reply('{"wrong": true}'));
    await expect(structured({ system: "s", user: "u", schema: Schema })).rejects.toThrow(/malformed output twice/);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe("errorMessage", () => {
  it("explains provider errors in plain words", () => {
    expect(errorMessage(new Groq.AuthenticationError(401, "bad key"))).toBe("Invalid GROQ_API_KEY.");
    expect(errorMessage(new Groq.RateLimitError(429, "slow down"))).toMatch(/Rate limited/);
    expect(errorMessage(new Groq.APIError(502, "upstream"))).toBe("Groq API error 502: upstream");
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("???")).toBe("Unknown error");
  });
});
