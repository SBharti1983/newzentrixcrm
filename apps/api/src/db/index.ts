import { drizzle } from 'drizzle-orm/node-postgres';
import splitPool, { writerPool, readerPool } from './pool'; 
import * as schema from './schema';
import * as relations from './relations';

// ── Master Write Instance ──────────────────────────────────────────
// Bind primary Drizzle instance to splitPool for automatic read/write splitting
export const db: any = drizzle(splitPool as any, { schema: { ...schema, ...relations } });
export const writeDb = db;

// ── Read Replica Instance (Scaling) ────────────────────────────────
export const readDb: any = drizzle(readerPool, { schema: { ...schema, ...relations } });

export * from './schema';
export * from './relations';
