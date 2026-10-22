import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

// Fix: Tell pg driver to interpret TIMESTAMP WITHOUT TIMEZONE values as UTC
// (Neon cloud stores NOW() in UTC, but pg driver by default treats them as local IST time)
// Type OID 1114 = TIMESTAMP WITHOUT TIME ZONE
pg.types.setTypeParser(1114, (str) => new Date(str + "Z"));

// Connection string from environment variables
const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ecommerce_oms";

// In Next.js development mode, prevent creating multiple client pools on hot-reload
let pool;

const isLocalhost =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

// Cloud databases (Neon, Supabase, Render, Aiven) require SSL
const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString,
    ssl: sslConfig,
  });
} else {
  if (!globalThis._pgPool) {
    globalThis._pgPool = new Pool({
      connectionString,
      ssl: sslConfig,
    });
  }
  pool = globalThis._pgPool;
}

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });
export { pool };
