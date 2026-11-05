# Remotion video generation

The `DopaminergicVideo` composition renders vertical 1080 × 1920 videos using
the marketing service's narration text and generated MP3 audio.

Open the composition preview with:

```bash
npm run remotion:studio
```

Render from an MP3 file:

```bash
npm run render:video -- --text "Tu guion de marketing" --audio "path/to/voice.mp3"
```

For `POST /api/marketing/generate`, save its JSON response to a file and pass it
to the renderer. The first generated video in the batch will be rendered:

```bash
npm run render:video -- --input-json "path/to/marketing-response.json"
```

Scheduled marketing episodes copy their generated audio to
`video-generador/public/audio` while Remotion CLI renders the episode to MP4.
The authenticated `GET /api/marketing/episodes/:episodeId/video` endpoint
streams the finished video, supports byte-range playback, and accepts
`?download=true` for a download response.

The default output is `out/dopaminergic-video.mp4`. Set `--output path/to/video.mp4`
to choose a different location. The `--text` and `--audio-base64` options are
also available for short test clips.
