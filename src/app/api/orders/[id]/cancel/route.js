import { NextResponse } from "next/server";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/cancel
 * Cancels a placed order and restores product stock back to inventory.
 * Requirements:
 * 1. Restore product quantities back to stock.
 * 2. Update status to 'Cancelled'.
 * 3. Prevent duplicate cancellation: if already cancelled, reject and do NOT restore stock twice!
 */
export async function POST(request, { params }) {
  const { id } = params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ success: false, error: "Invalid order ID." }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Fetch order with row lock (FOR UPDATE)
    const orderRes = await client.query(
      `SELECT id, customer_name AS "customerName", status
       FROM orders
       WHERE id = $1
       FOR UPDATE;`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK;");
      return NextResponse.json(
        { success: false, error: `Order #${orderId} not found.` },
        { status: 404 }
      );
    }

    const order = orderRes.rows[0];

    // Acceptance Scenario 5: Prevent double cancellation
    if (order.status === "Cancelled") {
      await client.query("ROLLBACK;");
      return NextResponse.json(
        {
          success: false,
          error: `Order #${orderId} has already been cancelled. Stock was already restored and cannot be restored twice.`,
        },
        { status: 400 }
      );
    }

    if (order.status !== "Placed") {
      await client.query("ROLLBACK;");
      return NextResponse.json(
        { success: false, error: `Order #${orderId} is currently "${order.status}" and cannot be cancelled.` },
        { status: 400 }
      );
    }

    // 2. Fetch all items in this order
    const itemsRes = await client.query(
      `SELECT product_id AS "productId", product_name AS "productName", quantity
       FROM order_items
       WHERE order_id = $1;`,
      [orderId]
    );

    const items = itemsRes.rows;

    // 3. Restore quantities back to products table and log each restock
    for (const item of items) {
      const updateProdRes = await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity + $1
         WHERE id = $2
         RETURNING stock_quantity AS "stockQuantity";`,
        [item.quantity, item.productId]
      );

      const resultingStock = updateProdRes.rows[0]?.stockQuantity ?? 0;

      // Log the inventory restock 
      await client.query(
        `INSERT INTO inventory_logs (product_id, product_name, change_type, quantity_change, resulting_stock, reference_id, note)
         VALUES ($1, $2, 'ORDER_RESTOCK', $3, $4, $5, $6);`,
        [
          item.productId,
          item.productName,
          item.quantity,
          resultingStock,
          `Order #${orderId}`,
          `Inventory restocked from cancelled Order #${orderId}`,
        ]
      );
    }

    // 4. Update order status to 'Cancelled'
    await client.query(
      `UPDATE orders
       SET status = 'Cancelled'
       WHERE id = $1;`,
      [orderId]
    );

    await client.query("COMMIT;");

    return NextResponse.json({
      success: true,
      message: `Order #${orderId} has been successfully cancelled and all items have been restored to inventory.`,
      orderId,
      status: "Cancelled",
    });
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel order: " + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
