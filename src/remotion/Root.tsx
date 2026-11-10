import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { DopaminergicVideo, type DopaminergicVideoProps } from "./Video";

const FPS = 30;
const DEFAULT_TEXT = "Cada entrenamiento te acerca a una versión más fuerte de ti.";
const DEFAULT_CALL_TO_ACTION = "Entrenadores: crea tu próximo plan con H-FLOW.";

export function RemotionRoot() {
  return (
    <Composition
      id="DopaminergicVideo"
      component={DopaminergicVideo}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={FPS * 10}
      defaultProps={{
        text: DEFAULT_TEXT,
        audioSrc: "",
        captions: [],
        callToAction: DEFAULT_CALL_TO_ACTION,
      } satisfies DopaminergicVideoProps}
      calculateMetadata={async ({ props }) => {
        const audioSrc =
          props.audioSrc &&
          !props.audioSrc.startsWith("data:") &&
          !/^https?:\/\//i.test(props.audioSrc)
            ? staticFile(props.audioSrc)
            : props.audioSrc;
        const durationInSeconds = audioSrc
          ? await getAudioDurationInSeconds(audioSrc)
          : Math.max(5, props.text.trim().split(/\s+/).filter(Boolean).length / 2.5);

        return { durationInFrames: Math.max(1, Math.ceil(durationInSeconds * FPS)) };
      }}
    />
  );
}
