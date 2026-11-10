jest.doMock("../hflow-backend/src/utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { runExclusiveVideoGeneration } = require(
  "../hflow-backend/src/services/videoGenerationQueue.service",
) as {
  runExclusiveVideoGeneration: <T>(jobName: string, task: () => Promise<T>) => Promise<T>;
};

describe("video generation queue", () => {
  it("runs queued provider/render jobs one at a time", async () => {
    let activeJobs = 0;
    let maxActiveJobs = 0;
    const jobs = Array.from({ length: 4 }, (_, index) =>
      runExclusiveVideoGeneration(`test-${index}`, async () => {
        activeJobs += 1;
        maxActiveJobs = Math.max(maxActiveJobs, activeJobs);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeJobs -= 1;
        return index;
      }),
    );

    await expect(Promise.all(jobs)).resolves.toEqual([0, 1, 2, 3]);
    expect(maxActiveJobs).toBe(1);
  });

  it("continues the queue after a job fails", async () => {
    const failure = runExclusiveVideoGeneration("failure", async () => {
      throw new Error("render failed");
    });
    const next = runExclusiveVideoGeneration("next", async () => "completed");

    await expect(failure).rejects.toThrow("render failed");
    await expect(next).resolves.toBe("completed");
  });
});
