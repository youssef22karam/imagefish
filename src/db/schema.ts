import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import type { Species } from '@/engine/types';
import type { GenFish } from '@/gen/generate';

export const uploadedSpecimens = pgTable('uploaded_specimens', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sciName: text('sci_name').notNull(),
  bauplan: text('bauplan').notNull(),
  habitat: text('habitat').notNull().default('reef'),
  sourcePreview: text('source_preview').notNull(),
  speciesJson: jsonb('species_json').$type<Species>().notNull(),
  genFishJson: jsonb('gen_fish_json').$type<GenFish>().notNull(),
  metricsJson: jsonb('metrics_json').$type<Record<string, unknown>>(),
  promptUsed: text('prompt_used'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type UploadedSpecimenRow = typeof uploadedSpecimens.$inferSelect;
