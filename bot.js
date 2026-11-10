/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS entrypoint loads backend TS through ts-node. */
const { randomUUID } = require("node:crypto");
const { open, mkdir, readFile, rename, rm, stat, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const readline = require("node:readline/promises");

const ROOT = __dirname;
const INITIAL_CHARACTER_BUDGET = 38_000;
const USAGE_FILE = path.join(ROOT, "storage", "elevenlabs-usage.json");
const LOCK_FILE = path.join(ROOT, "storage", "elevenlabs-usage.lock");
const CALL_TO_ACTION = "Entrenadores: crea tu próximo plan con H-FLOW.";

function logEvent(level, event, fields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: "hflow-video-generator",
    event,
    ...fields,
  };
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(record)}\n`);
}

function print(message) {
  process.stdout.write(`${message}\n`);
}

function countCharacters(text) {
  return Array.from(text).length;
}

function validateUsageState(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    !Number.isSafeInteger(value.remaining) ||
    value.remaining < 0 ||
    !Number.isSafeInteger(value.used) ||
    value.used < 0 ||
    !Array.isArray(value.requests)
  ) {
    throw new Error(
      `Invalid ElevenLabs usage file: ${USAGE_FILE}. Fix or remove it after checking your actual account balance.`,
    );
  }
  return value;
}

async function loadUsageState() {
  try {
    const contents = await readFile(USAGE_FILE, "utf8");
    return validateUsageState(JSON.parse(contents));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { remaining: INITIAL_CHARACTER_BUDGET, used: 0, requests: [] };
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in ${USAGE_FILE}. Check the saved balance before retrying.`,
        { cause: error },
      );
    }
    throw error;
  }
}

async function saveUsageState(state) {
  const directory = path.dirname(USAGE_FILE);
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${USAGE_FILE}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporaryPath, USAGE_FILE);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function acquireUsageLock() {
  await mkdir(path.dirname(LOCK_FILE), { recursive: true });
  try {
    return await open(LOCK_FILE, "wx");
  } catch (error) {
    if (error && error.code === "EEXIST") {
      throw new Error(
        "Another manual marketing render is already running. Do not start a second request.",
      );
    }
    throw error;
  }
}

function getCaptions(transcription, alignedTranscription) {
  const words = transcription?.words ?? [];
  if (words.length > 0) {
    return words.map(({ word, start, end }) => ({
      text: word,
      start,
      end,
    }));
  }

  return alignedTranscription.words.map(({ word, start, end }) => ({
    text: word,
    start,
    end,
  }));
}

async function renderVideo({ script, audio, captions, outputPath }) {
  const publicDirectory = path.join(
    ROOT,
    "storage",
    `remotion-public-${process.pid}-${randomUUID()}`,
  );
  const audioDirectory = path.join(publicDirectory, "audio");
  const audioFileName = "marketing-voice.mp3";
  const audioPath = path.join(audioDirectory, audioFileName);
  const propsPath = path.join(publicDirectory, "props.json");
  const cliPath = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
  const entryPoint = path.join(ROOT, "src", "remotion", "index.ts");

  try {
    await mkdir(audioDirectory, { recursive: true });
    await writeFile(audioPath, audio, { flag: "wx" });
    await writeFile(
      propsPath,
      JSON.stringify({
        text: script,
        audioSrc: `audio/${audioFileName}`,
        captions,
        callToAction: CALL_TO_ACTION,
      }),
      { flag: "wx" },
    );

    await new Promise((resolve, reject) => {
      const renderer = spawn(
        process.execPath,
        [
          cliPath,
          "render",
          entryPoint,
          "DopaminergicVideo",
          outputPath,
          `--props=${propsPath}`,
          `--public-dir=${publicDirectory}`,
          "--codec=h264",
          "--crf=23",
          "--pixel-format=yuv420p",
          "--concurrency=1",
          "--overwrite",
        ],
        { cwd: ROOT, stdio: ["ignore", "inherit", "pipe"] },
      );
      let errorOutput = "";
      renderer.stderr.setEncoding("utf8");
      renderer.stderr.on("data", (chunk) => {
        errorOutput = `${errorOutput}${chunk}`.slice(-4000);
      });
      renderer.once("error", reject);
      renderer.once("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `Remotion render failed (${code}): ${errorOutput.trim() || "no details"}`,
          ),
        );
      });
    });
    const output = await stat(outputPath);
    if (!output.isFile() || output.size === 0) {
      throw new Error("Remotion did not produce a valid MP4 file");
    }
  } finally {
    await rm(publicDirectory, { recursive: true, force: true });
  }
}

async function promptForText(rl, label) {
  const value = (await rl.question(`${label}: `)).trim();
  if (!value) {
    throw new Error(`${label} cannot be empty`);
  }
  return value;
}

async function runManualVideo(args = process.argv.slice(2)) {
  if (args.length > 0) {
    throw new Error("bot.js accepts no options; it always generates exactly one manually confirmed video.");
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("bot.js is manual-only; run it in an interactive terminal.");
  }

  require(path.join(ROOT, "hflow-backend", "node_modules", "dotenv")).config({
    path: path.join(ROOT, "hflow-backend", ".env"),
  });
  require(path.join(ROOT, "hflow-backend", "node_modules", "dotenv")).config({
    path: path.join(ROOT, ".env"),
    override: true,
  });
  require(path.join(ROOT, "hflow-backend", "node_modules", "ts-node")).register({
    project: path.join(ROOT, "hflow-backend", "tsconfig.json"),
    transpileOnly: true,
    compilerOptions: { module: "commonjs", moduleResolution: "node" },
  });
  const { VideoMarketingService } = require(
    path.join(ROOT, "hflow-backend", "src", "services", "videoMarketing.service.ts"),
  );

  for (const name of ["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"]) {
    if (!process.env[name]) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }

  const lock = await acquireUsageLock();
  let usageState;
  try {
    usageState = await loadUsageState();
    logEvent("info", "marketing_video_run_started", {
      remainingCharacters: usageState.remaining,
      videoLimit: 1,
      manualConfirmationRequired: true,
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const topic = await promptForText(rl, "Tema del vídeo");
      const audience = await promptForText(rl, "Audiencia");
      const tone = await promptForText(rl, "Tono");
      const service = new VideoMarketingService();
      const script = await service.generateScript({ topic, audience, tone });
      const requestedCharacters = countCharacters(script);
      const projectedRemaining = usageState.remaining - requestedCharacters;

      print("\nGuion que se enviará a ElevenLabs:");
      print(script);
      logEvent("info", "elevenlabs_character_usage_reserved", {
        requestedCharacters,
        remainingCharacters: usageState.remaining,
      });
      print(`Caracteres exactos de texto (Unicode): ${requestedCharacters.toLocaleString("es-ES")}`);
      print(`Saldo local antes de la locución: ${usageState.remaining.toLocaleString("es-ES")}`);

      if (projectedRemaining < 0) {
        throw new Error(
          `El guion supera el saldo local en ${Math.abs(projectedRemaining).toLocaleString("es-ES")} caracteres; no se llamó a ElevenLabs.`,
        );
      }

      const confirmation = (
        await rl.question(
          `Enviar este guion una sola vez a ElevenLabs? Escribe GENERAR para confirmar: `,
        )
      ).trim();
      if (confirmation !== "GENERAR") {
        print("Cancelado. No se llamó a ElevenLabs y no se descontaron caracteres.");
        return;
      }

      const requestId = randomUUID();
      const request = {
        id: requestId,
        characters: requestedCharacters,
        status: "reserved",
        createdAt: new Date().toISOString(),
      };
      usageState = {
        remaining: projectedRemaining,
        used: usageState.used + requestedCharacters,
        requests: [...usageState.requests, request],
      };
      await saveUsageState(usageState);
      logEvent("info", "elevenlabs_character_budget_reserved", {
        reservedCharacters: requestedCharacters,
        remainingCharacters: usageState.remaining,
      });

      let generatedVoice;
      try {
        generatedVoice = await service.generateVoiceWithAlignment(
          script,
          process.env.ELEVENLABS_VOICE_ID,
        );
      } catch (error) {
        logEvent("error", "elevenlabs_voice_generation_failed", {
          requestedCharacters,
          billingStatus: "unknown_reservation_retained",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      request.status = "voice_generated";
      await saveUsageState(usageState);
      logEvent("info", "elevenlabs_character_usage_consumed", {
        consumedCharacters: requestedCharacters,
        remainingCharacters: usageState.remaining,
        videoLimit: 1,
      });

      let transcription;
      try {
        transcription = await service.transcribeAudio(generatedVoice.audio);
        logEvent("info", "whisper_transcription_completed", { source: "openai" });
      } catch (error) {
        logEvent("warn", "whisper_transcription_failed_using_alignment", {
          message: error instanceof Error ? error.message : String(error),
        });
        transcription = generatedVoice.transcription;
      }

      const captions = getCaptions(transcription, generatedVoice.transcription);
      const outputPath = path.join(
        ROOT,
        "out",
        `hflow-marketing-${new Date().toISOString().replace(/[:.]/g, "-")}.mp4`,
      );
      await mkdir(path.dirname(outputPath), { recursive: true });
      await renderVideo({
        script,
        audio: generatedVoice.audio,
        captions,
        outputPath,
      });

      request.status = "completed";
      request.outputPath = path.relative(ROOT, outputPath);
      await saveUsageState(usageState);
      logEvent("info", "marketing_video_rendered", {
        outputPath,
        videos: 1,
        consumedCharacters: requestedCharacters,
        remainingCharacters: usageState.remaining,
      });
    } finally {
      rl.close();
    }
  } finally {
    await lock.close();
    await rm(LOCK_FILE, { force: true });
  }
}

if (require.main === module) {
  runManualVideo().catch((error) => {
    logEvent("error", "marketing_video_run_failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exitCode = 1;
  });
}

module.exports = {
  countCharacters,
  runManualVideo,
  validateUsageState,
};
