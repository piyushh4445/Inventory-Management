import { NextResponse } from "next/server";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders
 * Returns all orders, optionally filtered by status ('Placed', 'Cancelled')
 * and search (customer name or order ID).
 *  Order status filtering.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search")?.trim() || "";

    let query = `
      SELECT 
        o.id,
        o.customer_name AS "customerName",
        o.total_amount AS "totalAmount",
        o.status,
        o.created_at AS "createdAt",
        COUNT(oi.id)::int AS "itemCount"
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status if provided
    if (status && status !== "all") {
      params.push(status);
      query += ` AND LOWER(o.status) = LOWER($${params.length})`;
    }

    // Filter by customer name or order ID
    if (search) {
      if (!isNaN(parseInt(search, 10)) && Number(search).toString() === search) {
        params.push(parseInt(search, 10));
        query += ` AND o.id = $${params.length}`;
      } else {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND LOWER(o.customer_name) LIKE $${params.length}`;
      }
    }

    query += `
      GROUP BY o.id, o.customer_name, o.total_amount, o.status, o.created_at
      ORDER BY o.id DESC;
    `;

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, orders: result.rows });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new order with atomic inventory verification and deduction.
 * Critical Requirement:
 * - If ANY product has insufficient stock, the ENTIRE order is rejected.
 * - Transactions guarantee all-or-nothing atomicity.
 */
export async function POST(request) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { customerName, items } = body;

    // 1. Validate Customer Name
    if (!customerName || typeof customerName !== "string" || customerName.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Customer name is required." },
        { status: 400 }
      );
    }

    // 2. Validate Items array
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "An order must contain at least one product." },
        { status: 400 }
      );
    }

    // 3. Consolidate and validate line items
    // (If the customer added the same product multiple times, consolidate quantity)
    const consolidatedItemsMap = new Map();

    for (const item of items) {
      const productId = parseInt(item.productId, 10);
      const quantity = parseInt(item.quantity, 10);

      if (isNaN(productId) || productId <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid product selected." },
          { status: 400 }
        );
      }

      // Acceptance Scenario 6: Reject zero or negative values
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: "Quantity for every product must be a positive integer greater than 0." },
          { status: 400 }
        );
      }

      const existingQty = consolidatedItemsMap.get(productId) || 0;
      consolidatedItemsMap.set(productId, existingQty + quantity);
    }

    const consolidatedItems = Array.from(consolidatedItemsMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    // BEGIN PostgreSQL Transaction for Atomic Verification & Order Creation
    await client.query("BEGIN;");

    let calculatedTotal = 0;
    const preparedOrderItems = [];

    // 4. Verify each product exists and check stock using row lock (FOR UPDATE)
    for (const item of consolidatedItems) {
      const prodRes = await client.query(
        `SELECT id, name, sku, price, stock_quantity AS "stockQuantity"
         FROM products
         WHERE id = $1
         FOR UPDATE;`,
        [item.productId]
      );

      if (prodRes.rows.length === 0) {
        await client.query("ROLLBACK;");
        return NextResponse.json(
          { success: false, error: `Product with ID ${item.productId} was not found.` },
          { status: 400 }
        );
      }

      const product = prodRes.rows[0];
      const availableStock = product.stockQuantity;

      // Acceptance Scenario 2 & 3: Insufficient stock check
      if (availableStock < item.quantity) {
        await client.query("ROLLBACK;");
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for product "${product.name}" (SKU: ${product.sku}). Requested: ${item.quantity}, Available: ${availableStock}. Entire order has been rejected.`,
          },
          { status: 400 }
        );
      }

      const unitPrice = parseFloat(product.price);
      const subtotal = unitPrice * item.quantity;
      calculatedTotal += subtotal;

      preparedOrderItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
        currentStock: availableStock,
      });
    }

    // 5. Insert Order Header
    const orderInsertRes = await client.query(
      `INSERT INTO orders (customer_name, total_amount, status)
       VALUES ($1, $2, 'Placed')
       RETURNING id, customer_name AS "customerName", total_amount AS "totalAmount", status, created_at AS "createdAt";`,
      [customerName.trim(), calculatedTotal.toFixed(2)]
    );

    const createdOrder = orderInsertRes.rows[0];
    const orderId = createdOrder.id;

    // 6. Insert Order Items & Deduct Inventory
    for (const item of preparedOrderItems) {
      // Insert item
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [orderId, item.productId, item.name, item.sku, item.quantity, item.unitPrice, item.subtotal]
      );

      const newStock = item.currentStock - item.quantity;

      // Deduct stock from products table
      await client.query(
        `UPDATE products
         SET stock_quantity = $1
         WHERE id = $2;`,
        [newStock, item.productId]
      );

      // Record in inventory audit log (Bonus Feature #4)
      await client.query(
        `INSERT INTO inventory_logs (product_id, product_name, change_type, quantity_change, resulting_stock, reference_id, note)
         VALUES ($1, $2, 'ORDER_DEDUCTION', $3, $4, $5, $6);`,
        [
          item.productId,
          item.name,
          -item.quantity,
          newStock,
          `Order #${orderId}`,
          `Stock deducted for Order #${orderId} (${customerName.trim()})`,
        ]
      );
    }

    // COMMIT transaction: all updates succeed together
    await client.query("COMMIT;");

    return NextResponse.json(
      {
        success: true,
        message: `Order #${orderId} placed successfully!`,
        order: {
          id: orderId,
          customerName: createdOrder.customerName,
          totalAmount: createdOrder.totalAmount,
          status: createdOrder.status,
          createdAt: createdOrder.createdAt,
          itemsCount: preparedOrderItems.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place order: " + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
