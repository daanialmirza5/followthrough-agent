import { NextResponse } from "next/server";
import { getClient, hasKey, errorMessage, WHISPER_MODEL } from "@/lib/llm";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "Audio transcription needs GROQ_API_KEY (demo mode)." }, { status: 400 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No audio file" }, { status: 400 });
  if (file.size > 4.4 * 1024 * 1024) return NextResponse.json({ error: "File too large (max ~4 MB). Use a compressed .m4a/.mp3 or trim it." }, { status: 413 });
  try {
    const r = await getClient().audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      response_format: "json",
      language: "en",
    });
    return NextResponse.json({ text: r.text });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}
