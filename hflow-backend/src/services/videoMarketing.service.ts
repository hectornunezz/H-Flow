type ScriptRequest = {
  topic: string;
  audience: string;
  tone: string;
  durationSeconds?: number;
};

type WhisperWord = {
  word: string;
  start: number;
  end: number;
};

type WhisperSegment = {
  text: string;
  start: number;
  end: number;
};

type Transcription = {
  text: string;
  words: WhisperWord[];
  segments: WhisperSegment[];
};

type VideoMarketingAssets = {
  script: string;
  audio: Buffer;
  transcription: Transcription;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function throwApiError(response: Response, provider: string): Promise<never> {
  const detail = (await response.text()).slice(0, 500);
  throw new Error(
    `${provider} request failed (${response.status} ${response.statusText})${
      detail ? `: ${detail}` : ""
    }`,
  );
}

export class VideoMarketingService {
  async generateScript(request: ScriptRequest): Promise<string> {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres guionista de vídeos breves de marketing para entrenamiento. Escribe un guion claro, natural y adecuado para narración en voz alta. No inventes resultados garantizados.",
          },
          {
            role: "user",
            content: [
              `Tema: ${request.topic}`,
              `Audiencia: ${request.audience}`,
              `Tono: ${request.tone}`,
              request.durationSeconds
                ? `Duración aproximada: ${request.durationSeconds} segundos`
                : undefined,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      await throwApiError(response, "OpenAI");
    }

    const result: unknown = await response.json();
    if (!isRecord(result) || !Array.isArray(result.choices)) {
      throw new Error("OpenAI returned an invalid script response");
    }

    const firstChoice: unknown = result.choices[0];
    if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
      throw new Error("OpenAI returned an invalid script response");
    }

    const content = firstChoice.message.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI returned an empty script");
    }

    return content.trim();
  }

  async generateVoice(text: string, voiceId = requireEnv("ELEVENLABS_VOICE_ID")): Promise<Buffer> {
    if (!text.trim()) {
      throw new Error("Text is required to generate voice audio");
    }

    const apiKey = requireEnv("ELEVENLABS_API_KEY");
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
        }),
      },
    );

    if (!response.ok) {
      await throwApiError(response, "ElevenLabs");
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async transcribeAudio(audio: Buffer, fileName = "marketing-voice.mp3"): Promise<Transcription> {
    if (audio.length === 0) {
      throw new Error("Audio is required for transcription");
    }

    const apiKey = requireEnv("OPENAI_API_KEY");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)]), fileName);
    form.append("model", process.env.WHISPER_MODEL || "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      await throwApiError(response, "Whisper");
    }

    const result: unknown = await response.json();
    if (!isRecord(result) || typeof result.text !== "string") {
      throw new Error("Whisper returned an invalid transcription response");
    }

    const words = Array.isArray(result.words)
      ? result.words.flatMap((item): WhisperWord[] => {
          if (
            isRecord(item) &&
            typeof item.word === "string" &&
            typeof item.start === "number" &&
            typeof item.end === "number"
          ) {
            return [{ word: item.word, start: item.start, end: item.end }];
          }
          return [];
        })
      : [];
    const segments = Array.isArray(result.segments)
      ? result.segments.flatMap((item): WhisperSegment[] => {
          if (
            isRecord(item) &&
            typeof item.text === "string" &&
            typeof item.start === "number" &&
            typeof item.end === "number"
          ) {
            return [{ text: item.text, start: item.start, end: item.end }];
          }
          return [];
        })
      : [];

    return { text: result.text, words, segments };
  }

  async createMarketingAssets(request: ScriptRequest): Promise<VideoMarketingAssets> {
    const script = await this.generateScript(request);
    const audio = await this.generateVoice(script);
    const transcription = await this.transcribeAudio(audio);
    return { script, audio, transcription };
  }
}

export const videoMarketingService = new VideoMarketingService();
