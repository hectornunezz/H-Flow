const { countCharacters, runManualVideo, validateUsageState } = jest.requireActual<{
  countCharacters: (text: string) => number;
  validateUsageState: (value: unknown) => {
    remaining: number;
    used: number;
    requests: unknown[];
  };
  runManualVideo: () => Promise<void>;
}>("../bot");

describe("manual marketing bot", () => {
  it("counts Unicode characters including spaces and punctuation", () => {
    expect(countCharacters("H-Flow 🧡!")).toBe(9);
  });

  it("accepts a valid persisted ElevenLabs budget", () => {
    const state = { remaining: 37_500, used: 500, requests: [] };
    expect(validateUsageState(state)).toBe(state);
  });

  it("fails closed for malformed or negative local balances", () => {
    expect(() => validateUsageState({ remaining: -1, used: 0, requests: [] })).toThrow(
      "Invalid ElevenLabs usage file",
    );
    expect(() => validateUsageState({ remaining: 10, used: 0 })).toThrow(
      "Invalid ElevenLabs usage file",
    );
  });

  it("refuses to run without an interactive terminal", async () => {
    await expect(runManualVideo([])).rejects.toThrow(
      "bot.js is manual-only; run it in an interactive terminal.",
    );
  });

  it("rejects options that could bypass the single-video manual flow", async () => {
    await expect(runManualVideo(["--batch", "5"])).rejects.toThrow(
      "bot.js accepts no options",
    );
  });
});
