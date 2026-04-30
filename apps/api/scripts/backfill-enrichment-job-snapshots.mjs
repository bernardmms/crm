import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const DEFAULT_ICP_PAYLOAD = {
  industry: '',
  geo: '',
  produto: '',
  target_titles: [],
  company_size: '10-100 funcionários',
  max_leads: 20,
  min_score: 5,
  max_companies: 30,
};

function safeParseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseLegacyIcpDescription(raw) {
  if (!raw) return null;
  const text = raw.trim();
  if (!text || text.startsWith('{')) return null;

  const targetTitlesMatch = text.match(/Cargos alvo:\s*(.+?)(?:\.|$)/i);
  const companySizeMatch = text.match(/com tamanho\s+(.+?),\s*que precisam/i);
  const produtoMatch = text.match(/que precisam de\s+(.+?)(?:\.|$)/i);
  const headMatch = text.match(/^(.*?)(?:\s+em\s+)([^,\.]+)(?:,|\.|$)/i);

  const result = {};
  if (headMatch) {
    const industry = headMatch[1]?.trim();
    const geo = headMatch[2]?.trim();
    if (industry) result.industry = industry;
    if (geo) result.geo = geo;
  }

  const companySize = companySizeMatch?.[1]?.trim();
  if (companySize) result.company_size = companySize;

  const produto = produtoMatch?.[1]?.trim();
  if (produto) result.produto = produto;

  const targetTitles = targetTitlesMatch?.[1]
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (targetTitles?.length) result.target_titles = targetTitles;

  return Object.keys(result).length > 0 ? result : null;
}

function buildJobNameFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const parts = [snapshot.industry, snapshot.geo, snapshot.produto]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
  return parts.length > 0 ? parts.join(' · ') : null;
}

function normalizeIcpPayload(input) {
  return {
    industry: typeof input?.industry === 'string' ? input.industry : DEFAULT_ICP_PAYLOAD.industry,
    geo: typeof input?.geo === 'string' ? input.geo : DEFAULT_ICP_PAYLOAD.geo,
    produto: typeof input?.produto === 'string' ? input.produto : DEFAULT_ICP_PAYLOAD.produto,
    target_titles: Array.isArray(input?.target_titles)
      ? input.target_titles.map((value) => String(value)).filter(Boolean)
      : DEFAULT_ICP_PAYLOAD.target_titles,
    company_size:
      typeof input?.company_size === 'string'
        ? input.company_size
        : DEFAULT_ICP_PAYLOAD.company_size,
    max_leads:
      typeof input?.max_leads === 'number' ? input.max_leads : DEFAULT_ICP_PAYLOAD.max_leads,
    min_score:
      typeof input?.min_score === 'number' ? input.min_score : DEFAULT_ICP_PAYLOAD.min_score,
    max_companies:
      typeof input?.max_companies === 'number'
        ? input.max_companies
        : DEFAULT_ICP_PAYLOAD.max_companies,
  };
}

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function deriveJobName(job) {
  if (job.jobName?.trim()) return job.jobName.trim();

  const snapshot = job.icpJson && typeof job.icpJson === 'object' && !Array.isArray(job.icpJson)
    ? job.icpJson
    : safeParseJson(job.icpRaw);

  const fromSnapshot = buildJobNameFromSnapshot(snapshot);
  if (fromSnapshot) return fromSnapshot;

  if (job.icpRaw?.trim() && !job.icpRaw.trim().startsWith('{')) {
    return job.icpRaw.trim();
  }

  return null;
}

async function main() {
  const jobs = await prisma.enrichmentJob.findMany({
    select: {
      id: true,
      jobName: true,
      icpJson: true,
      icpRaw: true,
    },
  });

  let updated = 0;

  for (const job of jobs) {
    const parsedRaw = job.icpJson ?? safeParseJson(job.icpRaw) ?? parseLegacyIcpDescription(job.icpRaw);
    const parsed = parsedRaw ? normalizeIcpPayload(parsedRaw) : null;
    const nextJobName = deriveJobName({
      ...job,
      icpJson: parsed ?? job.icpJson,
    });

    const shouldUpdateJobName = !job.jobName && !!nextJobName;
    const shouldUpdateIcpJson =
      !!parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      stableStringify(job.icpJson ?? {}) !== stableStringify(parsed);

    if (!shouldUpdateJobName && !shouldUpdateIcpJson) continue;

    await prisma.enrichmentJob.update({
      where: { id: job.id },
      data: {
        ...(shouldUpdateJobName ? { jobName: nextJobName } : {}),
        ...(shouldUpdateIcpJson ? { icpJson: parsed } : {}),
      },
    });

    updated++;
  }

  console.log(`Backfill complete. Jobs updated: ${updated}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
