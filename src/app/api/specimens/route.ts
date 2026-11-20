import { desc, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { uploadedSpecimens } from '@/db/schema';
import type { Species } from '@/engine/types';
import type { GenFish } from '@/gen/generate';

export const dynamic = 'force-dynamic';

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS uploaded_specimens (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sci_name TEXT NOT NULL,
      bauplan TEXT NOT NULL,
      habitat TEXT NOT NULL DEFAULT 'reef',
      source_preview TEXT NOT NULL,
      species_json JSONB NOT NULL,
      gen_fish_json JSONB NOT NULL,
      metrics_json JSONB,
      prompt_used TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  ensured = true;
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await db
      .select()
      .from(uploadedSpecimens)
      .orderBy(desc(uploadedSpecimens.createdAt))
      .limit(40);
    return NextResponse.json({ specimens: rows });
  } catch (err) {
    console.error('GET /api/specimens failed:', err);
    return NextResponse.json({ specimens: [], error: 'Failed to load specimens' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = (await req.json()) as {
      slug?: string;
      name?: string;
      sciName?: string;
      bauplan?: string;
      habitat?: string;
      sourcePreview?: string;
      species?: Species;
      genFish?: GenFish;
      metrics?: Record<string, unknown>;
      promptUsed?: string;
    };

    if (!body.species || !body.genFish || !body.sourcePreview) {
      return NextResponse.json({ error: 'Missing required specimen payload' }, { status: 400 });
    }

    const slug = (body.slug || body.species.id || `upload-${Date.now()}`).slice(0, 120);
    const name = (body.name || body.species.name || 'Reconstructed Specimen').slice(0, 120);
    const sciName = (body.sciName || body.species.sci || 'Morphichthys novus').slice(0, 120);
    const bauplan = (body.bauplan || 'teleost').slice(0, 48);
    const habitat = (body.habitat || body.genFish.habitat || 'reef').slice(0, 48);

    const existing = await db
      .select({ id: uploadedSpecimens.id })
      .from(uploadedSpecimens)
      .where(eq(uploadedSpecimens.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(uploadedSpecimens)
        .set({
          name,
          sciName,
          bauplan,
          habitat,
          sourcePreview: body.sourcePreview,
          speciesJson: body.species,
          genFishJson: body.genFish,
          metricsJson: body.metrics ?? null,
          promptUsed: body.promptUsed ?? null,
        })
        .where(eq(uploadedSpecimens.slug, slug))
        .returning();
      return NextResponse.json({ specimen: updated });
    }

    const [inserted] = await db
      .insert(uploadedSpecimens)
      .values({
        slug,
        name,
        sciName,
        bauplan,
        habitat,
        sourcePreview: body.sourcePreview,
        speciesJson: body.species,
        genFishJson: body.genFish,
        metricsJson: body.metrics ?? null,
        promptUsed: body.promptUsed ?? null,
      })
      .returning();

    return NextResponse.json({ specimen: inserted }, { status: 201 });
  } catch (err) {
    console.error('POST /api/specimens failed:', err);
    return NextResponse.json({ error: 'Failed to save specimen' }, { status: 500 });
  }
}
