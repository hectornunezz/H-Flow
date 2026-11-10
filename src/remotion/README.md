# Remotion video generation

The `DopaminergicVideo` composition renders vertical 1080 × 1920 videos using
the marketing service's narration text, generated MP3 audio, and timed captions.

Generate one marketing video manually (requires an interactive terminal,
OpenAI and ElevenLabs credentials, and an explicit `GENERAR` confirmation):

```bash
npm run marketing:manual
```

The script generates one script, displays its exact Unicode character count,
checks the local ElevenLabs budget initialized to 38,000 characters, reserves
the count before sending the voice request, and renders one H.264 MP4. Usage is
tracked across runs in the ignored `storage/elevenlabs-usage.json` file. This
local counter tracks requests made through `bot.js`, not usage from the
ElevenLabs website or other clients. If that balance changes outside this
script, reconcile the counter with the actual account balance before running
another generation.

Whisper's timestamped transcript is used for captions when available. If
Whisper is unavailable, the script falls back to ElevenLabs' character-level
audio alignment so the video can still use synchronized captions.

Open the composition preview with:

```bash
npm run remotion:studio
```

Render from an MP3 file:

```bash
npm run render:video -- --text "Tu guion de marketing" --audio "path/to/voice.mp3"
```

Scheduled marketing episodes copy their generated audio to
`video-generador/public/audio` while Remotion CLI renders the episode to MP4.
The authenticated `GET /api/marketing/episodes/:episodeId/video` endpoint
streams the finished video, supports byte-range playback, and accepts
`?download=true` for a download response.

The default output is `out/dopaminergic-video.mp4`. Set `--output path/to/video.mp4`
to choose a different location. The `--text` and `--audio-base64` options are
also available for short test clips.
