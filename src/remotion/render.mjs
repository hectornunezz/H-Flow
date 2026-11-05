import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

function readArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const name = argument.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`);
    }
    if (options[name] !== undefined) {
      throw new Error(`Option --${name} was provided more than once`);
    }
    options[name] = value;
    index += 1;
  }
  return options;
}

async function main() {
  const options = readArguments(process.argv.slice(2));
  let text;
  let audio;
  let contentType = "audio/mpeg";

  if (options["input-json"]) {
    if (options.text || options.audio || options["audio-base64"]) {
      throw new Error("--input-json cannot be combined with --text, --audio, or --audio-base64");
    }

    const responseText = await readFile(path.resolve(options["input-json"]), "utf8");
    const response = JSON.parse(responseText.replace(/^\uFEFF/, ""));
    const video = response?.data?.videos?.[0];
    if (
      typeof video?.script !== "string" ||
      typeof video.audioBase64 !== "string" ||
      !video.audioBase64
    ) {
      throw new Error("Input JSON must contain data.videos[0].script and audioBase64");
    }
    text = video.script;
    audio = Buffer.from(video.audioBase64, "base64");
    if (typeof video.audioContentType === "string") {
      contentType = video.audioContentType;
    }
  } else {
    if (typeof options.text !== "string" || !options.text.trim()) {
      throw new Error("Provide non-empty narration text with --text");
    }

    const hasAudioFile = typeof options.audio === "string";
    const hasAudioBase64 = typeof options["audio-base64"] === "string";
    if (hasAudioFile === hasAudioBase64) {
      throw new Error("Provide exactly one of --audio <file> or --audio-base64 <base64>");
    }

    audio = hasAudioFile
      ? await readFile(path.resolve(options.audio))
      : Buffer.from(options["audio-base64"], "base64");
    text = options.text.trim();
  }

  if (audio.length === 0) {
    throw new Error("Audio input is empty");
  }

  const inputProps = {
    text,
    audioSrc: `data:${contentType};base64,${audio.toString("base64")}`,
  };
  const outputLocation = path.resolve(
    options.output || path.join("out", "dopaminergic-video.mp4"),
  );
  await mkdir(path.dirname(outputLocation), { recursive: true });

  const serveUrl = await bundle({
    entryPoint: path.join(currentDirectory, "index.ts"),
  });
  const composition = await selectComposition({
    serveUrl,
    id: "DopaminergicVideo",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
  });
  console.log(`Video rendered to ${outputLocation}`);
}

main().catch((error) => {
  console.error("Video rendering failed:", error);
  process.exitCode = 1;
});
