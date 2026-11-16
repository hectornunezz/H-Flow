import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(sourceDirectory, "../../hflow-backend");
const backendRequire = createRequire(path.join(backendDirectory, "package.json"));
const hyperframesPackage = backendRequire.resolve("hyperframes/package.json");
const cliPath = path.join(path.dirname(hyperframesPackage), "bin", "hyperframes.mjs");
const gsapPath = backendRequire.resolve("gsap/dist/gsap.min.js");
const templatePath = path.join(sourceDirectory, "marketing-template.html");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toSafeScriptJson(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function normalizeCaptions(value, script, duration) {
  const valid = Array.isArray(value)
    ? value.filter(
        (caption) =>
          isRecord(caption) &&
          typeof caption.text === "string" &&
          caption.text.trim() &&
          typeof caption.start === "number" &&
          Number.isFinite(caption.start) &&
          caption.start >= 0 &&
          typeof caption.end === "number" &&
          Number.isFinite(caption.end) &&
          caption.end > caption.start,
      )
    : [];
  if (valid.length > 0) {
    return valid.map((caption) => ({
      text: caption.text.trim(),
      start: caption.start,
      end: caption.end,
    }));
  }

  const words = script.trim().split(/\s+/);
  const wordsPerCaption = 5;
  const interval = duration / Math.max(Math.ceil(words.length / wordsPerCaption), 1);
  return Array.from({ length: Math.ceil(words.length / wordsPerCaption) }, (_, index) => ({
    text: words.slice(index * wordsPerCaption, (index + 1) * wordsPerCaption).join(" "),
    start: index * interval,
    end: Math.min(duration, (index + 1) * interval),
  }));
}

function renderCaptions(captions) {
  return captions
    .map(
      ({ text, start, end }, index) =>
        `<p id="caption-${index}" class="clip caption" data-start="${start}" data-duration="${end - start}">${escapeHtml(text)}</p>`,
    )
    .join("\n        ");
}

function createComposition(template, input, captions, duration, width, height) {
  const cta = typeof input.callToAction === "string" && input.callToAction.trim()
    ? input.callToAction.trim()
    : "Entrenadores: crea tu próximo plan con H-FLOW.";
  const ctaDuration = Math.min(4, duration);
  const ctaStart = Math.max(0, duration - ctaDuration);
  const replacements = {
    RESOLUTION: width > height ? "landscape" : "portrait",
    WIDTH: String(width),
    HEIGHT: String(height),
    DURATION: String(duration),
    TOPIC: escapeHtml(input.topic),
    AUDIENCE: escapeHtml(input.audience),
    TONE: escapeHtml(input.tone),
    CAPTIONS: renderCaptions(captions),
    CAPTION_TIMING: toSafeScriptJson(captions.map(({ start, end }) => ({ start, end }))),
    CALL_TO_ACTION: escapeHtml(cta),
    CTA_START: String(ctaStart),
  };
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_match, name) => {
    if (!(name in replacements)) throw new Error(`Unknown Hyperframes template token: ${name}`);
    return replacements[name];
  });
}

function runRenderer(projectDirectory, outputPath) {
  return new Promise((resolve, reject) => {
    const renderer = spawn(
      process.execPath,
      [
        cliPath,
        "render",
        "-c",
        "index.html",
        "-o",
        outputPath,
        "--workers",
        "1",
        "--quiet",
      ],
      { cwd: projectDirectory, stdio: ["ignore", "pipe", "pipe"] },
    );
    let output = "";
    const capture = (chunk) => {
      output = `${output}${chunk}`.slice(-8000);
    };
    renderer.stdout.setEncoding("utf8").on("data", capture);
    renderer.stderr.setEncoding("utf8").on("data", capture);
    renderer.once("error", reject);
    renderer.once("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Hyperframes render failed (${code}): ${output.trim() || "no details"}`));
      }
    });
  });
}

async function main() {
  const [inputPath, requestedOutputPath] = process.argv.slice(2);
  if (!inputPath || !requestedOutputPath || process.argv.length !== 4) {
    throw new Error("Usage: node render.mjs <input.json> <output.mp4>");
  }

  const input = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
  if (
    !isRecord(input) ||
    typeof input.script !== "string" ||
    !input.script.trim() ||
    typeof input.audioBase64 !== "string" ||
    !input.audioBase64 ||
    typeof input.topic !== "string" ||
    typeof input.audience !== "string" ||
    typeof input.tone !== "string"
  ) {
    throw new Error("Input must contain script, audioBase64, topic, audience, and tone");
  }

  const audio = Buffer.from(input.audioBase64, "base64");
  if (audio.length === 0) throw new Error("Audio input is empty");

  const aspectRatio = input.aspectRatio === "16:9" ? "16:9" : "9:16";
  const [width, height] = aspectRatio === "16:9" ? [1920, 1080] : [1080, 1920];
  const requestedDuration =
    typeof input.durationSeconds === "number" &&
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds > 0
      ? input.durationSeconds
      : 30;
  const captions = normalizeCaptions(input.captions, input.script, requestedDuration);
  const lastCaptionEnd = captions.reduce((latest, caption) => Math.max(latest, caption.end), 0);
  const duration = Math.max(requestedDuration, lastCaptionEnd + 4);
  const outputPath = path.resolve(requestedOutputPath);
  const projectDirectory = await mkdtemp(path.join(os.tmpdir(), "hflow-hyperframes-"));

  try {
    const template = await readFile(templatePath, "utf8");
    const html = createComposition(template, input, captions, duration, width, height);
    await Promise.all([
      writeFile(path.join(projectDirectory, "index.html"), html, { flag: "wx" }),
      writeFile(path.join(projectDirectory, "narration.mp3"), audio, { flag: "wx" }),
      copyFile(gsapPath, path.join(projectDirectory, "gsap.min.js")),
    ]);

    await runRenderer(projectDirectory, outputPath);
    const output = await stat(outputPath);
    if (!output.isFile() || output.size === 0) {
      throw new Error("Hyperframes did not produce a valid MP4 file");
    }
  } finally {
    await rm(projectDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
