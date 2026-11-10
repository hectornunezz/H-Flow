import logger from "../utils/logger";

let queue: Promise<void> = Promise.resolve();
let waitingCount = 0;

export function runExclusiveVideoGeneration<T>(
  jobName: string,
  task: () => Promise<T>,
): Promise<T> {
  const queuedAt = Date.now();
  waitingCount += 1;

  const run = queue.then(async () => {
    waitingCount -= 1;
    logger.info("Video generation queue acquired", {
      jobName,
      queueWaitMs: Date.now() - queuedAt,
      waitingJobs: waitingCount,
      activeJobs: 1,
    });
    try {
      return await task();
    } finally {
      logger.info("Video generation queue released", {
        jobName,
        waitingJobs: waitingCount,
        activeJobs: 0,
      });
    }
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
