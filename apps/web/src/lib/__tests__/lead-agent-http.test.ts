import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MOCK_BASE_URL = "https://agent.example.com";
const MOCK_API_KEY = "test-key-123";

vi.stubEnv("VITE_LEAD_AGENT_BASE_URL", MOCK_BASE_URL);
vi.stubEnv("VITE_LEAD_AGENT_API_KEY", MOCK_API_KEY);

function mockOk(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockError(status: number, body: unknown = { message: "error" }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("leadAgentClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  describe("createJob", () => {
    it("POSTs to /api/v1/enrich with X-API-Key header", async () => {
      fetchMock.mockResolvedValueOnce(
        mockOk({ job_id: "abc-123", status: "queued", message: "Job queued" }),
      );

      const { leadAgentClient } = await import("../lead-agent-client");
      const result = await leadAgentClient.createJob({
        industry: "solar",
        geo: "São Paulo",
        produto: "CRM",
        target_titles: ["CEO"],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_BASE_URL}/api/v1/enrich`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-Key": MOCK_API_KEY }),
        }),
      );
      expect(result.job_id).toBe("abc-123");
      expect(result.status).toBe("queued");
    });

    it("throws LeadAgentServiceUnavailableError on 401", async () => {
      fetchMock.mockResolvedValueOnce(mockError(401, { message: "Unauthorized" }));
      const { leadAgentClient, LeadAgentServiceUnavailableError } = await import("../lead-agent-client");

      await expect(
        leadAgentClient.createJob({ industry: "x", geo: "y", produto: "z", target_titles: [] }),
      ).rejects.toBeInstanceOf(LeadAgentServiceUnavailableError);
    });

    it("throws on 503 with message from response", async () => {
      fetchMock.mockResolvedValueOnce(mockError(503, { detail: "Service down" }));
      const { leadAgentClient, LeadAgentServiceUnavailableError } = await import("../lead-agent-client");

      await expect(
        leadAgentClient.createJob({ industry: "x", geo: "y", produto: "z", target_titles: [] }),
      ).rejects.toBeInstanceOf(LeadAgentServiceUnavailableError);
    });
  });

  describe("getJobStatus", () => {
    it("GETs /api/v1/jobs/:id with auth header", async () => {
      const payload = {
        job_id: "abc-123",
        status: "searching",
        progress: 0.4,
        current_funnel_stage: "searching",
        stage_counts: { searching: 12 },
        leads: [],
        total_leads: null,
        next_cursor: null,
        drop_reasons_top: [],
        created_at: "2026-04-28T00:00:00Z",
        updated_at: "2026-04-28T00:01:00Z",
      };
      fetchMock.mockResolvedValueOnce(mockOk(payload));

      const { leadAgentClient } = await import("../lead-agent-client");
      const result = await leadAgentClient.getJobStatus("abc-123");

      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_BASE_URL}/api/v1/jobs/abc-123`,
        expect.objectContaining({
          headers: expect.objectContaining({ "X-API-Key": MOCK_API_KEY }),
        }),
      );
      expect(result.status).toBe("searching");
      expect(result.stage_counts).toEqual({ searching: 12 });
    });

    it("throws LeadAgentNotFoundError on 404", async () => {
      fetchMock.mockResolvedValueOnce(mockError(404));
      const { leadAgentClient, LeadAgentNotFoundError } = await import("../lead-agent-client");

      await expect(leadAgentClient.getJobStatus("missing")).rejects.toBeInstanceOf(
        LeadAgentNotFoundError,
      );
    });
  });
});
