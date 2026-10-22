import { NextResponse } from "next/server";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/inventory-logs
 * Bonus Feature #4: Returns the inventory audit history log
 * showing stock additions, order deductions, and cancellation restocks.
 */
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        product_id AS "productId",
        product_name AS "productName",
        change_type AS "changeType",
        quantity_change AS "quantityChange",
        resulting_stock AS "resultingStock",
        reference_id AS "referenceId",
        note,
        created_at AS "createdAt"
      FROM inventory_logs
      ORDER BY id DESC
      LIMIT 100;
    `);

    return NextResponse.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inventory logs: " + error.message },
      { status: 500 }
    );
  }
}
