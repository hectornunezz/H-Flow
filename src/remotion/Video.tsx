import {
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type DopaminergicVideoProps = {
  text: string;
  audioSrc: string;
  captions?: Array<{ text: string; start: number; end: number }>;
  callToAction?: string;
};

const WORDS_PER_SCENE = 5;
const WORDS_PER_CAPTION = 5;

export function DopaminergicVideo({
  text,
  audioSrc,
  captions = [],
  callToAction = "Entrenadores: crea tu próximo plan con H-FLOW.",
}: DopaminergicVideoProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const words =
    captions.length > 0
      ? captions.map(({ text: captionText }) => captionText.trim())
      : text.trim().split(/\s+/).filter(Boolean);
  const framesPerWord = durationInFrames / Math.max(words.length, 1);
  const currentTime = frame / fps;
  let timedWordIndex = 0;
  let activeCaptionIndex = -1;
  for (let index = 0; index < captions.length; index += 1) {
    const caption = captions[index];
    if (currentTime >= caption.start) timedWordIndex = index;
    if (currentTime >= caption.start && currentTime <= caption.end) {
      activeCaptionIndex = index;
    }
  }
  const activeWordIndex =
    captions.length > 0
      ? timedWordIndex
      : Math.min(
          Math.floor(frame / framesPerWord),
          Math.max(words.length - 1, 0),
        );
  const sceneStartIndex = Math.floor(activeWordIndex / WORDS_PER_SCENE) * WORDS_PER_SCENE;
  const sceneWords = words.slice(sceneStartIndex, sceneStartIndex + WORDS_PER_SCENE);
  const activeSceneWordIndex = activeWordIndex - sceneStartIndex;
  const sceneFrame = frame - sceneStartIndex * framesPerWord;
  const entrance = spring({ frame: sceneFrame, fps, config: { damping: 14, stiffness: 120 } });
  const captionStartIndex =
    activeCaptionIndex < 0
      ? -1
      : Math.floor(activeCaptionIndex / WORDS_PER_CAPTION) * WORDS_PER_CAPTION;
  const activeCaption =
    captionStartIndex < 0
      ? ""
      : captions
          .slice(captionStartIndex, activeCaptionIndex + 1)
          .map(({ text: captionText }) => captionText.trim())
          .filter(Boolean)
          .join(" ")
          .replace(/\s+([,.!?;:])/g, "$1");
  const pulse = 1 + Math.sin(frame / 7) * 0.025;
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });
  const signalOffset = interpolate(frame, [0, durationInFrames], [180, 0], {
    extrapolateRight: "clamp",
  });
  const callToActionOpacity = interpolate(
    frame,
    [Math.max(0, durationInFrames - fps * 5), durationInFrames - fps * 2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const resolvedAudioSrc =
    audioSrc && !audioSrc.startsWith("data:") && !/^https?:\/\//i.test(audioSrc)
      ? staticFile(audioSrc)
      : audioSrc;

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "radial-gradient(ellipse at 50% 34%, rgba(234,88,12,0.12) 0%, rgba(3,7,18,0) 38%), linear-gradient(180deg, #030712 0%, #080d18 52%, #030712 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, Helvetica, sans-serif",
        height: "100%",
        justifyContent: "center",
        overflow: "hidden",
        padding: 90,
        position: "relative",
        width: "100%",
      }}
    >
      {resolvedAudioSrc ? <Audio src={resolvedAudioSrc} /> : null}
      <div
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          inset: 0,
          maskImage: "linear-gradient(180deg, black 0%, transparent 92%)",
          opacity: 0.36,
          position: "absolute",
        }}
      />
      <div
        style={{
          background: "#f97316",
          borderRadius: "50%",
          filter: "blur(125px)",
          height: 500,
          opacity: 0.15,
          position: "absolute",
          right: -180,
          top: 280,
          transform: `scale(${pulse})`,
          width: 500,
        }}
      />
      <div
        style={{
          background: "#ea580c",
          borderRadius: "50%",
          bottom: 320,
          filter: "blur(130px)",
          height: 420,
          left: -200,
          opacity: 0.12,
          position: "absolute",
          transform: `scale(${2 - pulse})`,
          width: 420,
        }}
      />

      <div
        style={{
          alignItems: "center",
          backgroundColor: "rgba(15,23,42,0.72)",
          border: "1px solid rgba(249,115,22,0.24)",
          borderRadius: 999,
          display: "flex",
          fontSize: 25,
          fontWeight: 700,
          gap: 16,
          letterSpacing: 3.5,
          padding: "16px 26px",
          position: "absolute",
          top: 170,
          textTransform: "uppercase",
        }}
      >
        <svg aria-hidden="true" height="38" viewBox="0 0 42 42" width="38">
          <defs>
            <linearGradient id="brand-fire" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
          <path
            d="M8 7v28M34 7v28M8 21h7l4-9 6 18 4-9h5M5 7h6M31 7h6M5 35h6M31 35h6"
            fill="none"
            stroke="url(#brand-fire)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
        </svg>
        <span>H-FLOW</span>
        <span
          style={{
            color: "#94a3b8",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          PERFORMANCE
        </span>
      </div>

      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.48), rgba(3,7,18,0.08))",
          border: "1px solid rgba(148,163,184,0.08)",
          borderRadius: 36,
          display: "flex",
          flexWrap: "wrap",
          gap: "14px 20px",
          justifyContent: "center",
          maxWidth: 940,
          minHeight: 390,
          padding: "42px 38px",
          position: "relative",
          textAlign: "center",
          transform: `translateY(${(1 - entrance) * 35}px) scale(${0.94 + entrance * 0.06})`,
        }}
      >
        {sceneWords.map((word, index) => {
          const isActive = index === activeSceneWordIndex;
          return (
            <span
              key={`${sceneStartIndex + index}-${word}`}
              style={{
                color: isActive ? "#fb923c" : "rgba(248,250,252,0.88)",
                fontSize: isActive ? 82 : 68,
                fontWeight: 900,
                lineHeight: 1.08,
                textShadow: isActive ? "0 6px 36px rgba(249,115,22,0.42)" : "none",
                transform: isActive ? "scale(1.06)" : "scale(1)",
                transition: "color 100ms linear",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      <div
        style={{
          alignItems: "center",
          backgroundColor: "rgba(3,7,18,0.84)",
          border: "1px solid rgba(249,115,22,0.5)",
          borderRadius: 18,
          bottom: 390,
          color: "#fff",
          display: "flex",
          fontSize: 36,
          fontWeight: 800,
          justifyContent: "center",
          lineHeight: 1.25,
          maxWidth: 900,
          minHeight: 88,
          opacity: activeCaption ? 1 : 0,
          padding: "18px 26px",
          position: "absolute",
          textAlign: "center",
          textShadow: "0 2px 16px rgba(0,0,0,0.7)",
        }}
      >
        {activeCaption}
      </div>
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
          borderRadius: 16,
          bottom: 270,
          boxShadow: "0 12px 40px rgba(249,115,22,0.24)",
          color: "#030712",
          display: "flex",
          fontSize: 31,
          fontWeight: 900,
          justifyContent: "center",
          maxWidth: 900,
          opacity: callToActionOpacity,
          padding: "20px 30px",
          position: "absolute",
          textAlign: "center",
          transform: `translateY(${(1 - callToActionOpacity) * 20}px)`,
        }}
      >
        {callToAction}
      </div>
      <div
        style={{
          alignItems: "center",
          bottom: 220,
          color: "rgba(248,250,252,0.74)",
          display: "flex",
          fontSize: 21,
          fontWeight: 700,
          gap: 18,
          letterSpacing: 5,
          position: "absolute",
          textTransform: "uppercase",
        }}
      >
        <svg aria-hidden="true" height="30" viewBox="0 0 96 30" width="96">
          <path
            d="M1 16h19l7-10 10 19 9-14 7 5h42"
            fill="none"
            stroke="url(#signal-fire)"
            strokeDasharray="180"
            strokeDashoffset={signalOffset}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <defs>
            <linearGradient id="signal-fire" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>
        </svg>
        TU PRÓXIMA REPETICIÓN CUENTA
      </div>
      <div
        style={{
          backgroundColor: "rgba(148,163,184,0.16)",
          borderRadius: 999,
          bottom: 100,
          height: 8,
          left: 90,
          overflow: "hidden",
          position: "absolute",
          right: 90,
        }}
      >
        <div
          style={{
            background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
            borderRadius: 999,
            boxShadow: "0 0 22px rgba(249,115,22,0.45)",
            height: "100%",
            width: `${progress}%`,
          }}
        />
      </div>
      <div
        style={{
          bottom: 56,
          color: "rgba(148,163,184,0.62)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 4,
          position: "absolute",
          textTransform: "uppercase",
        }}
      >
        PERFORMANCE · CONSISTENCY · PROGRESS
      </div>
    </div>
  );
}
