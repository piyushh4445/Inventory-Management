import { NextResponse } from "next/server";
import { initializeDatabase } from "@/db/init.js";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/init
 * Checks database connectivity and auto-creates tables/seeds sample products.
 */
export async function GET() {
  try {
    // Test raw connectivity first
    const testResult = await pool.query("SELECT NOW();");
    
    // Auto-create tables and seed initial data if needed
    const initResult = await initializeDatabase();

    return NextResponse.json({
      connected: true,
      timestamp: testResult.rows[0].now,
      message: "Database connected and initialized successfully!",
    });
  } catch (error) {
    console.error("Database connection/init error:", error);
    return NextResponse.json(
      {
        connected: false,
        error: error.message,
        hint: "Please ensure PostgreSQL is running and DATABASE_URL in .env.local is correct.",
      },
      { status: 500 }
    );
  }
}
