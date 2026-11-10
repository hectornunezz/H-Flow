import { VideoMarketingService } from "../hflow-backend/src/services/videoMarketing.service";
import logger from "../hflow-backend/src/utils/logger";

const voiceEnvironmentVariables = [
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_LANGUAGE_CODE",
  "ELEVENLABS_VOICE_ID",
  "ELEVENLABS_OUTPUT_FORMAT",
  "ELEVENLABS_SIMILARITY_BOOST",
  "ELEVENLABS_SPEED",
  "ELEVENLABS_STABILITY",
  "ELEVENLABS_STYLE",
  "ELEVENLABS_USE_SPEAKER_BOOST",
];

describe("VideoMarketingService ElevenLabs integration", () => {
  const originalEnvironment = new Map<string, string | undefined>();
  const originalFetch = global.fetch;
  const service = new VideoMarketingService();

  beforeEach(() => {
    for (const name of voiceEnvironmentVariables) {
      originalEnvironment.set(name, process.env[name]);
    }

    process.env.ELEVENLABS_API_KEY = "test-api-key";
    process.env.ELEVENLABS_LANGUAGE_CODE = "es";
    process.env.ELEVENLABS_VOICE_ID = "corporate-voice";
    process.env.ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
    process.env.ELEVENLABS_STABILITY = "0.45";
    process.env.ELEVENLABS_SIMILARITY_BOOST = "0.82";
    process.env.ELEVENLABS_STYLE = "0.15";
    process.env.ELEVENLABS_SPEED = "0.98";
    process.env.ELEVENLABS_USE_SPEAKER_BOOST = "true";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const name of voiceEnvironmentVariables) {
      const previousValue = originalEnvironment.get(name);
      if (previousValue === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousValue;
      }
    }
    originalEnvironment.clear();
    global.fetch = originalFetch;
  });

  it("uses timestamped Spanish speech and returns captions aligned to that audio", async () => {
    const requestedText = "Hola, mundo. 🧡";
    const characters = [...requestedText];
    const starts = characters.map((_, index) => index / 10);
    const ends = starts.map((start) => start + 0.08);
    const audio = Buffer.from("fake-mp3").toString("base64");
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          audio_base64: audio,
          alignment: {
            characters,
            character_start_times_seconds: starts,
            character_end_times_seconds: ends,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const infoLog = jest.spyOn(logger, "info");
    const generatedAudio = await service.generateVoice(requestedText, "corporate-voice");

    expect(generatedAudio).toEqual(Buffer.from("fake-mp3"));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = (global.fetch as jest.Mock).mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(requestUrl.pathname).toBe(
      "/v1/text-to-speech/corporate-voice/with-timestamps",
    );
    expect(requestUrl.searchParams.get("output_format")).toBe("mp3_44100_128");
    expect((requestInit.headers as Record<string, string>)["xi-api-key"]).toBe("test-api-key");
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(requestInit.body as string)).toMatchObject({
      text: requestedText,
      model_id: "eleven_multilingual_v2",
      language_code: "es",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.82,
        style: 0.15,
        speed: 0.98,
        use_speaker_boost: true,
      },
    });
    expect(infoLog).toHaveBeenCalledWith(
      "ElevenLabs character usage consumed",
      expect.objectContaining({ consumedCharacters: Array.from(requestedText).length }),
    );
  });

  it("logs exact reserved characters and does not retry failed provider requests", async () => {
    const error = new TypeError("network unavailable");
    (global.fetch as jest.Mock).mockRejectedValue(error);
    const infoLog = jest.spyOn(logger, "info");
    const errorLog = jest.spyOn(logger, "error");
    const text = "H-Flow 🧡";

    await expect(service.generateVoice(text, "corporate-voice")).rejects.toThrow(
      "network unavailable",
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(infoLog).toHaveBeenCalledWith(
      "ElevenLabs character usage reserved",
      expect.objectContaining({ requestedCharacters: Array.from(text).length }),
    );
    expect(errorLog).toHaveBeenCalledWith(
      "ElevenLabs speech request failed",
      expect.objectContaining({ requestedCharacters: Array.from(text).length }),
    );
  });

  it("rejects timestamp responses that cannot be synchronized with video frames", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          audio_base64: Buffer.from("fake-mp3").toString("base64"),
          alignment: {
            characters: ["H", "i"],
            character_start_times_seconds: [0],
            character_end_times_seconds: [0.1, 0.2],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(service.generateVoice("Hi", "corporate-voice")).rejects.toThrow(
      "ElevenLabs did not return valid character-level audio alignment",
    );
  });

  it("uses the voice alignment as the marketing transcription without a second transcription call", async () => {
    jest.spyOn(service, "generateScript").mockResolvedValue("Hola, equipo.");
    const characters = [..."Hola, equipo."];
    const starts = characters.map((_, index) => index / 8);
    const ends = starts.map((start) => start + 0.06);
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          audio_base64: Buffer.from("aligned-audio").toString("base64"),
          normalized_alignment: {
            characters,
            character_start_times_seconds: starts,
            character_end_times_seconds: ends,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const assets = await service.createMarketingAssets({
      topic: "Entrenamiento",
      audience: "Entrenadores",
      tone: "Cercano",
    });

    expect(assets.audio).toEqual(Buffer.from("aligned-audio"));
    expect(assets.transcription.text).toBe("Hola, equipo.");
    expect(assets.transcription.words).toEqual([
      { word: "Hola,", start: 0, end: 0.56 },
      { word: "equipo.", start: 0.75, end: 1.56 },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid voice settings before sending a provider request", async () => {
    process.env.ELEVENLABS_STABILITY = "1.5";

    await expect(service.generateVoice("Hola", "corporate-voice")).rejects.toThrow(
      "ELEVENLABS_STABILITY must be a number between 0 and 1",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
