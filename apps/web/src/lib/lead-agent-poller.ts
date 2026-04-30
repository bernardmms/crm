export type PollableJobStatus = {
  job_id: string;
  status: string;
  progress: number | null;
  current_funnel_stage: string | null;
  stage_counts: Record<string, number> | null;
  total_leads: number | null;
  drop_reasons_top: Record<string, number> | null;
  created_at: string;
  updated_at: string;
};

export type PollerCallbacks = {
  onProgress: (status: PollableJobStatus) => void;
  onComplete: (status: PollableJobStatus) => void;
  onError: (err: Error) => void;
};

export type PollerConfig = {
  initialDelayMs?: number;
  stepMs?: number;
  maxDelayMs?: number;
};

const FINAL_STATUSES = new Set(["completed", "partial", "failed", "cancelled"]);

export type CancelFn = () => void;

export function createPoller(
  fetcher: (jobId: string) => Promise<PollableJobStatus>,
  callbacks: PollerCallbacks,
  config: PollerConfig = {},
): (jobId: string) => CancelFn {
  const {
    initialDelayMs = 2000,
    stepMs = 2000,
    maxDelayMs = 10000,
  } = config;

  return (jobId: string): CancelFn => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = initialDelayMs;

    async function poll() {
      if (cancelled) return;

      try {
        const status = await fetcher(jobId);
        if (cancelled) return;

        if (FINAL_STATUSES.has(status.status)) {
          callbacks.onComplete(status);
          return;
        }

        callbacks.onProgress(status);
      } catch (err) {
        if (cancelled) return;
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      }

      if (!cancelled) {
        timer = setTimeout(() => void poll(), delay);
        delay = Math.min(delay + stepMs, maxDelayMs);
      }
    }

    timer = setTimeout(() => void poll(), delay);

    return () => {
      cancelled = true;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    };
  };
}
