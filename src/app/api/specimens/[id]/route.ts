import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { uploadedSpecimens } from '@/db/schema';
import type { Species } from '@/engine/types';
import type { GenFish } from '@/gen/generate';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: 'Invalid specimen id' }, { status: 400 });
    }
    const body = (await req.json()) as {
      name?: string;
      sciName?: string;
      habitat?: string;
      species?: Species;
      genFish?: GenFish;
    };

    const patch: Partial<typeof uploadedSpecimens.$inferInsert> = {};
    if (body.name) patch.name = body.name.slice(0, 120);
    if (body.sciName) patch.sciName = body.sciName.slice(0, 120);
    if (body.habitat) patch.habitat = body.habitat.slice(0, 48);
    if (body.species) patch.speciesJson = body.species;
    if (body.genFish) patch.genFishJson = body.genFish;

    const [updated] = await db
      .update(uploadedSpecimens)
      .set(patch)
      .where(eq(uploadedSpecimens.id, numId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Specimen not found' }, { status: 404 });
    }
    return NextResponse.json({ specimen: updated });
  } catch (err) {
    console.error('PATCH /api/specimens/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to update specimen' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numId = Number(id);
    if (!Number.isFinite(numId)) {
      return NextResponse.json({ error: 'Invalid specimen id' }, { status: 400 });
    }
    await db.delete(uploadedSpecimens).where(eq(uploadedSpecimens.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/specimens/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to delete specimen' }, { status: 500 });
  }
}
