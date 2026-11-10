import { randomUUID } from "node:crypto";
import logger from "../utils/logger";

type ScriptRequest = {
  topic: string;
  audience: string;
  tone: string;
  durationSeconds?: number;
};

export type WhisperWord = {
  word: string;
  start: number;
  end: number;
};

export type WhisperSegment = {
  text: string;
  start: number;
  end: number;
};

export type Transcription = {
  text: string;
  words: WhisperWord[];
  segments: WhisperSegment[];
};

export type VideoMarketingAssets = {
  script: string;
  audio: Buffer;
  transcription: Transcription;
};

type GeneratedVoice = {
  audio: Buffer;
  transcription: Transcription;
};

type TimedAlignment = {
  characters: string[];
  characterStartTimes: number[];
  characterEndTimes: number[];
};

export const TRAINER_CALL_TO_ACTION = "Entrenadores: crea tu próximo plan con H-FLOW.";
const DEFAULT_DURATION_SECONDS = 30;
const SCRIPT_REQUEST_TIMEOUT_MS = 45_000;
const ELEVENLABS_REQUEST_TIMEOUT_MS = 120_000;
const WHISPER_REQUEST_TIMEOUT_MS = 90_000;
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.45,
  similarityBoost: 0.82,
  style: 0.15,
  speed: 0.98,
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

function getVoiceSetting(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const configured = process.env[name];
  if (configured === undefined || configured.trim() === "") return fallback;

  const value = Number(configured);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a number between ${minimum} and ${maximum}`);
  }
  return value;
}

function getSpeakerBoostSetting(): boolean {
  const configured = process.env.ELEVENLABS_USE_SPEAKER_BOOST;
  if (configured === undefined || configured.trim() === "") return true;

  const value = configured.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("ELEVENLABS_USE_SPEAKER_BOOST must be true or false");
}

function parseTimedAlignment(value: unknown): TimedAlignment | undefined {
  if (!isRecord(value)) return undefined;
  const characters = value.characters;
  const starts = value.character_start_times_seconds;
  const ends = value.character_end_times_seconds;
  if (
    !Array.isArray(characters) ||
    !Array.isArray(starts) ||
    !Array.isArray(ends) ||
    characters.length === 0 ||
    characters.length !== starts.length ||
    characters.length !== ends.length
  ) {
    return undefined;
  }

  const alignedCharacters: string[] = [];
  const characterStartTimes: number[] = [];
  const characterEndTimes: number[] = [];
  let previousStart = -1;
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    const start = starts[index];
    const end = ends[index];
    if (
      typeof character !== "string" ||
      typeof start !== "number" ||
      !Number.isFinite(start) ||
      start < previousStart ||
      typeof end !== "number" ||
      !Number.isFinite(end) ||
      end < start
    ) {
      return undefined;
    }
    alignedCharacters.push(character);
    characterStartTimes.push(start);
    characterEndTimes.push(end);
    previousStart = start;
  }

  return {
    characters: alignedCharacters,
    characterStartTimes,
    characterEndTimes,
  };
}

function getAlignedTranscription(alignment: TimedAlignment): Transcription {
  const characters = alignment.characters;
  const words: WhisperWord[] = [];
  let wordText = "";
  let wordStart = 0;
  let wordEnd = 0;

  const flushWord = (): void => {
    if (!wordText) return;
    words.push({ word: wordText, start: wordStart, end: wordEnd });
    wordText = "";
  };

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (/^\s+$/.test(character)) {
      flushWord();
      continue;
    }

    if (!wordText) wordStart = alignment.characterStartTimes[index];
    wordText += character;
    wordEnd = alignment.characterEndTimes[index];
  }
  flushWord();

  if (words.length === 0) {
    throw new Error("ElevenLabs returned character alignment without any speech");
  }

  const segments: WhisperSegment[] = [];
  let segmentWords: WhisperWord[] = [];
  const flushSegment = (): void => {
    if (segmentWords.length === 0) return;
    segments.push({
      text: segmentWords.map(({ word }) => word).join(" "),
      start: segmentWords[0].start,
      end: segmentWords[segmentWords.length - 1].end,
    });
    segmentWords = [];
  };

  for (const word of words) {
    segmentWords.push(word);
    if (/[.!?…]["'”’)]*$/.test(word.word) || segmentWords.length >= 8) {
      flushSegment();
    }
  }
  flushSegment();

  return {
    text: characters.join("").trim(),
    words,
    segments,
  };
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
              `Eres guionista de vídeos breves de marketing para entrenamiento. Escribe un guion claro, natural y adecuado para narración en voz alta. No inventes resultados garantizados. Termina exactamente con esta llamada a la acción dirigida a entrenadores: "${TRAINER_CALL_TO_ACTION}"`,
          },
          {
            role: "user",
            content: [
              `Tema: ${request.topic}`,
              `Audiencia: ${request.audience}`,
              `Tono: ${request.tone}`,
              `Duración aproximada: ${request.durationSeconds ?? DEFAULT_DURATION_SECONDS} segundos`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      }),
      signal: AbortSignal.timeout(SCRIPT_REQUEST_TIMEOUT_MS),
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

    const script = content.trim();
    return script.endsWith(TRAINER_CALL_TO_ACTION)
      ? script
      : `${script} ${TRAINER_CALL_TO_ACTION}`;
  }

  async generateVoice(
    text: string,
    voiceId = requireEnv("ELEVENLABS_VOICE_ID"),
  ): Promise<Buffer> {
    const generatedVoice = await this.generateVoiceWithAlignment(text, voiceId);
    return generatedVoice.audio;
  }

  async generateVoiceWithAlignment(
    text: string,
    voiceId: string,
  ): Promise<GeneratedVoice> {
    if (!text.trim()) {
      throw new Error("Text is required to generate voice audio");
    }

    const apiKey = requireEnv("ELEVENLABS_API_KEY");
    const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
    if (!/^mp3_44100_(32|64|96|128|192)$/.test(outputFormat)) {
      throw new Error(
        "ELEVENLABS_OUTPUT_FORMAT must be an mp3_44100 format with a supported bitrate",
      );
    }
    const endpoint = new URL(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`,
    );
    endpoint.searchParams.set("output_format", outputFormat);
    const voiceSettings = {
      stability: getVoiceSetting(
        "ELEVENLABS_STABILITY",
        DEFAULT_VOICE_SETTINGS.stability,
        0,
        1,
      ),
      similarity_boost: getVoiceSetting(
        "ELEVENLABS_SIMILARITY_BOOST",
        DEFAULT_VOICE_SETTINGS.similarityBoost,
        0,
        1,
      ),
      style: getVoiceSetting("ELEVENLABS_STYLE", DEFAULT_VOICE_SETTINGS.style, 0, 1),
      speed: getVoiceSetting(
        "ELEVENLABS_SPEED",
        DEFAULT_VOICE_SETTINGS.speed,
        0.7,
        1.2,
      ),
      use_speaker_boost: getSpeakerBoostSetting(),
    };
    const requestId = randomUUID();
    const requestedCharacters = Array.from(text).length;
    const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
    logger.info("ElevenLabs character usage reserved", {
      requestId,
      requestedCharacters,
      voiceId,
      modelId,
    });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          ...(process.env.ELEVENLABS_LANGUAGE_CODE
            ? { language_code: process.env.ELEVENLABS_LANGUAGE_CODE }
            : {}),
          voice_settings: voiceSettings,
        }),
        signal: AbortSignal.timeout(ELEVENLABS_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        await throwApiError(response, "ElevenLabs");
      }

      const result: unknown = await response.json();
      if (!isRecord(result) || typeof result.audio_base64 !== "string") {
        throw new Error("ElevenLabs returned an invalid timestamped speech response");
      }

      const audio = Buffer.from(result.audio_base64, "base64");
      if (audio.length === 0) {
        throw new Error("ElevenLabs returned empty speech audio");
      }

      const alignment =
        parseTimedAlignment(result.normalized_alignment) ??
        parseTimedAlignment(result.alignment);
      if (!alignment) {
        throw new Error("ElevenLabs did not return valid character-level audio alignment");
      }

      logger.info("ElevenLabs character usage consumed", {
        requestId,
        consumedCharacters: requestedCharacters,
        audioBytes: audio.length,
      });
      return {
        audio,
        transcription: getAlignedTranscription(alignment),
      };
    } catch (error) {
      logger.error("ElevenLabs speech request failed", {
        requestId,
        requestedCharacters,
        error,
      });
      throw error;
    }
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
      signal: AbortSignal.timeout(WHISPER_REQUEST_TIMEOUT_MS),
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
    const generatedVoice = await this.generateVoiceWithAlignment(
      script,
      requireEnv("ELEVENLABS_VOICE_ID"),
    );
    return { script, ...generatedVoice };
  }
}

export const videoMarketingService = new VideoMarketingService();
