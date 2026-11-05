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
};

const WORDS_PER_SCENE = 5;

export function DopaminergicVideo({ text, audioSrc }: DopaminergicVideoProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const framesPerWord = durationInFrames / Math.max(words.length, 1);
  const activeWordIndex = Math.min(
    Math.floor(frame / framesPerWord),
    Math.max(words.length - 1, 0),
  );
  const sceneStartIndex = Math.floor(activeWordIndex / WORDS_PER_SCENE) * WORDS_PER_SCENE;
  const sceneWords = words.slice(sceneStartIndex, sceneStartIndex + WORDS_PER_SCENE);
  const activeSceneWordIndex = activeWordIndex - sceneStartIndex;
  const sceneFrame = frame - sceneStartIndex * framesPerWord;
  const entrance = spring({ frame: sceneFrame, fps, config: { damping: 14, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame / 7) * 0.025;
  const progress = interpolate(frame, [0, durationInFrames], [0, 100], {
    extrapolateRight: "clamp",
  });
  const resolvedAudioSrc =
    audioSrc && !audioSrc.startsWith("data:") && !/^https?:\/\//i.test(audioSrc)
      ? staticFile(audioSrc)
      : audioSrc;

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "radial-gradient(ellipse at 50% 38%, #30205d 0%, #111126 46%, #080910 100%)",
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
        style={{
          background: "#a855f7",
          borderRadius: "50%",
          filter: "blur(100px)",
          height: 440,
          opacity: 0.24,
          position: "absolute",
          right: -120,
          top: 210,
          transform: `scale(${pulse})`,
          width: 440,
        }}
      />
      <div
        style={{
          background: "#06b6d4",
          borderRadius: "50%",
          bottom: 180,
          filter: "blur(110px)",
          height: 360,
          left: -140,
          opacity: 0.2,
          position: "absolute",
          transform: `scale(${2 - pulse})`,
          width: 360,
        }}
      />

      <div
        style={{
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 999,
          display: "flex",
          fontSize: 28,
          fontWeight: 700,
          gap: 14,
          letterSpacing: 4,
          padding: "18px 30px",
          position: "absolute",
          top: 210,
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "#c084fc", fontSize: 30 }}>●</span>
        H-FLOW · ENTRENA MEJOR
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px 18px",
          justifyContent: "center",
          maxWidth: 920,
          minHeight: 340,
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
                color: isActive ? "#facc15" : "rgba(255,255,255,0.9)",
                fontSize: isActive ? 82 : 68,
                fontWeight: 900,
                lineHeight: 1.08,
                textShadow: isActive ? "0 6px 34px rgba(250,204,21,0.4)" : "none",
                transform: isActive ? "scale(1.08) rotate(-2deg)" : "scale(1)",
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
          bottom: 180,
          color: "rgba(255,255,255,0.7)",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 6,
          position: "absolute",
          textTransform: "uppercase",
        }}
      >
        TU PRÓXIMA REPETICIÓN CUENTA
      </div>
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.2)",
          bottom: 86,
          height: 8,
          left: 90,
          position: "absolute",
          right: 90,
        }}
      >
        <div
          style={{
            background: "linear-gradient(90deg, #a855f7, #22d3ee)",
            height: "100%",
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}
