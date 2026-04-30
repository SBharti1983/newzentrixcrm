import { drizzle } from 'drizzle-orm/node-postgres';
import { writerPool, readerPool } from './pool'; 
import * as schema from './schema';
import * as relations from './relations';

// ── Master Write Instance ──────────────────────────────────────────
export const db = drizzle(writerPool, { schema: { ...schema, ...relations } });
export const writeDb = db;

// ── Read Replica Instance (Scaling) ────────────────────────────────
export const readDb = drizzle(readerPool, { schema: { ...schema, ...relations } });

export * from './schema';
export * from './relations';
