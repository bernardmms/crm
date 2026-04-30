import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function normalizeComparable(value) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function inferMatchKeys(lead, contact) {
  const matches = new Set();
  const leadEmail = normalizeComparable(lead.email);
  const leadPhone = normalizeComparable(lead.phone);

  if (leadEmail && leadEmail === normalizeComparable(contact.email)) {
    matches.add('email');
  }

  if (leadPhone && leadPhone === normalizeComparable(contact.phone)) {
    matches.add('phone');
  }

  return [...matches];
}

async function main() {
  const leads = await prisma.agentLead.findMany({
    select: {
      id: true,
      jobId: true,
      email: true,
      phone: true,
    },
  });

  let linked = 0;

  for (const lead of leads) {
    const or = [];
    if (lead.email) or.push({ email: lead.email });
    if (lead.phone) or.push({ phone: lead.phone });
    if (or.length === 0) continue;

    const contacts = await prisma.contact.findMany({
      where: { OR: or },
      select: { id: true, email: true, phone: true, notes: true },
    });

    for (const contact of contacts) {
      const matchedBy = inferMatchKeys(lead, contact);
      await prisma.agentLeadContact.upsert({
        where: {
          agentLeadId_contactId: {
            agentLeadId: lead.id,
            contactId: contact.id,
          },
        },
        create: {
          jobId: lead.jobId,
          agentLeadId: lead.id,
          contactId: contact.id,
          matchedBy,
        },
        update: {
          matchedBy,
        },
      });
      linked++;
    }
  }

  console.log(`Backfill complete. Links processed: ${linked}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
