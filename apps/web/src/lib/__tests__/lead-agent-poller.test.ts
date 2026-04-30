import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPoller } from "../lead-agent-poller";
import type { PollableJobStatus } from "../lead-agent-poller";

function makeStatus(overrides: Partial<PollableJobStatus> = {}): PollableJobStatus {
  return {
    job_id: "job-1",
    status: "searching",
    progress: 0.3,
    current_funnel_stage: "searching",
    stage_counts: null,
    total_leads: null,
    drop_reasons_top: null,
    created_at: "2026-04-28T00:00:00Z",
    updated_at: "2026-04-28T00:00:01Z",
    ...overrides,
  };
}

describe("createPoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onProgress for non-final status", async () => {
    const fetcher = vi.fn().mockResolvedValue(makeStatus({ status: "searching" }));
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const start = createPoller(fetcher, { onProgress, onComplete, onError }, { initialDelayMs: 100, stepMs: 100, maxDelayMs: 500 });
    const cancel = start("job-1");

    await vi.advanceTimersByTimeAsync(150);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: "searching" }));
    expect(onComplete).not.toHaveBeenCalled();

    cancel();
  });

  it("calls onComplete for completed status and stops polling", async () => {
    const fetcher = vi.fn().mockResolvedValue(makeStatus({ status: "completed" }));
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const start = createPoller(fetcher, { onProgress, onComplete, onError }, { initialDelayMs: 100, stepMs: 100, maxDelayMs: 500 });
    start("job-1");

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("calls onComplete for partial and failed statuses", async () => {
    for (const status of ["partial", "failed", "cancelled"]) {
      const fetcher = vi.fn().mockResolvedValue(makeStatus({ status }));
      const onComplete = vi.fn();

      const start = createPoller(fetcher, { onProgress: vi.fn(), onComplete, onError: vi.fn() }, { initialDelayMs: 50 });
      start("job-1");

      await vi.advanceTimersByTimeAsync(100);
      expect(onComplete).toHaveBeenCalledOnce();
    }
  });

  it("applies backoff: each retry increases delay by stepMs up to maxDelayMs", async () => {
    const callTimes: number[] = [];
    const fetcher = vi.fn().mockImplementation(() => {
      callTimes.push(Date.now());
      return Promise.resolve(makeStatus({ status: "enriching" }));
    });

    const start = createPoller(fetcher, { onProgress: vi.fn(), onComplete: vi.fn(), onError: vi.fn() }, {
      initialDelayMs: 2000,
      stepMs: 2000,
      maxDelayMs: 6000,
    });
    start("job-1");

    // 1st poll at 2s
    await vi.advanceTimersByTimeAsync(2001);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 2nd poll at 2s + 4s = 6s
    await vi.advanceTimersByTimeAsync(4001);
    expect(fetcher).toHaveBeenCalledTimes(2);

    // 3rd poll at 6s (capped) after 6s total
    await vi.advanceTimersByTimeAsync(6001);
    expect(fetcher).toHaveBeenCalledTimes(3);

    // still 6s between subsequent calls
    await vi.advanceTimersByTimeAsync(6001);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("cancel() stops future polls", async () => {
    const fetcher = vi.fn().mockResolvedValue(makeStatus({ status: "searching" }));
    const onProgress = vi.fn();

    const start = createPoller(fetcher, { onProgress, onComplete: vi.fn(), onError: vi.fn() }, { initialDelayMs: 100, stepMs: 100 });
    const cancel = start("job-1");

    await vi.advanceTimersByTimeAsync(150);
    expect(fetcher).toHaveBeenCalledOnce();

    cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("calls onError on fetch failure and continues polling", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(makeStatus({ status: "completed" }));
    const onError = vi.fn();
    const onComplete = vi.fn();

    const start = createPoller(fetcher, { onProgress: vi.fn(), onComplete, onError }, { initialDelayMs: 100, stepMs: 100, maxDelayMs: 500 });
    start("job-1");

    await vi.advanceTimersByTimeAsync(150);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "network error" }));

    await vi.advanceTimersByTimeAsync(300);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("does not call callbacks after cancel() even if fetch resolves late", async () => {
    let resolvePromise!: (v: PollableJobStatus) => void;
    const fetcher = vi.fn().mockReturnValue(
      new Promise<PollableJobStatus>((resolve) => { resolvePromise = resolve; }),
    );
    const onProgress = vi.fn();

    const start = createPoller(fetcher, { onProgress, onComplete: vi.fn(), onError: vi.fn() }, { initialDelayMs: 100 });
    const cancel = start("job-1");

    await vi.advanceTimersByTimeAsync(150);
    expect(fetcher).toHaveBeenCalledOnce();

    cancel();
    resolvePromise(makeStatus({ status: "searching" }));
    await Promise.resolve();

    expect(onProgress).not.toHaveBeenCalled();
  });
});
