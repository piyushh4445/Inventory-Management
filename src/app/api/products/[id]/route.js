import { NextResponse } from "next/server";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * Update product stock quantity.
 */
export async function PATCH(request, { params }) {
  const { id } = params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ success: false, error: "Invalid product ID." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { stockQuantity } = body;

    const parsedStock = parseInt(stockQuantity, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json(
        { success: false, error: "Stock quantity must be a non-negative integer (0 or greater)." },
        { status: 400 }
      );
    }

    // Check if product exists
    const checkProduct = await pool.query(
      `SELECT id, name, stock_quantity AS "stockQuantity" FROM products WHERE id = $1;`,
      [productId]
    );

    if (checkProduct.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Product with ID ${productId} not found.` },
        { status: 404 }
      );
    }

    const currentProduct = checkProduct.rows[0];
    const diff = parsedStock - currentProduct.stockQuantity;

    // Update stock in products table
    const updateRes = await pool.query(
      `UPDATE products
       SET stock_quantity = $1
       WHERE id = $2
       RETURNING id, name, sku, price, stock_quantity AS "stockQuantity", created_at AS "createdAt";`,
      [parsedStock, productId]
    );

    // Record stock adjustment in inventory logs (Bonus Feature #4)
    if (diff !== 0) {
      await pool.query(
        `INSERT INTO inventory_logs (product_id, product_name, change_type, quantity_change, resulting_stock, reference_id, note)
         VALUES ($1, $2, 'MANUAL_UPDATE', $3, $4, 'Admin Stock Update', 'Manual adjustment by admin');`,
        [productId, currentProduct.name, diff, parsedStock]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Stock quantity updated successfully!",
      product: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Error updating product stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update stock: " + error.message },
      { status: 500 }
    );
  }
}
