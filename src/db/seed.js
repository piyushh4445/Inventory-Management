import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeDatabase } from "./init.js";
import { pool } from "./index.js";

async function runSeed() {
  console.log("Running database setup and seed...");
  try {
    await initializeDatabase();
    console.log("Setup complete!");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await pool.end();
  }
}

runSeed();
