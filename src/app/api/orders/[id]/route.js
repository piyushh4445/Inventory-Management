import { NextResponse } from "next/server";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[id]
 * Fetch detailed information for a single order including line items.
 */
export async function GET(request, { params }) {
  const { id } = params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ success: false, error: "Invalid order ID." }, { status: 400 });
  }

  try {
    // 1. Fetch order header
    const orderRes = await pool.query(
      `SELECT 
        id, 
        customer_name AS "customerName", 
        total_amount AS "totalAmount", 
        status, 
        created_at AS "createdAt"
       FROM orders 
       WHERE id = $1;`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Order #${orderId} not found.` },
        { status: 404 }
      );
    }

    const order = orderRes.rows[0];

    // 2. Fetch order items
    const itemsRes = await pool.query(
      `SELECT 
        id, 
        product_id AS "productId", 
        product_name AS "productName", 
        product_sku AS "productSku", 
        quantity, 
        unit_price AS "unitPrice", 
        subtotal
       FROM order_items 
       WHERE order_id = $1 
       ORDER BY id ASC;`,
      [orderId]
    );

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: itemsRes.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order details: " + error.message },
      { status: 500 }
    );
  }
}
