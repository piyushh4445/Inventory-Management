import { NextResponse } from "next/server";
import { pool } from "@/db/index.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/products
 * Fetch all products with optional search and stock filtering (Bonus Feature #2).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const stockStatus = searchParams.get("stockStatus") || "all";
    const stockOrder = searchParams.get("stockOrder");

    let query = `SELECT id, name, sku, price, stock_quantity AS "stockQuantity", created_at AS "createdAt" FROM products WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(sku) LIKE $${params.length})`;
    }

    if (stockStatus === "inStock") {
      query += ` AND stock_quantity > 0`;
    } else if (stockStatus === "outOfStock") {
      query += ` AND stock_quantity <= 0`;
    }

    if (stockOrder === "asc" || stockOrder === "desc") {
      query += ` ORDER BY stock_quantity ${stockOrder.toUpperCase()}, id ASC`;
    } else {
      query += ` ORDER BY id ASC`;
    }

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, products: result.rows });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product.
 * Bonus Feature #1: Validates and prevents duplicate SKUs.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, sku, price, stockQuantity } = body;

    // Validation: Product Name
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Product name is required." },
        { status: 400 }
      );
    }

    // 2. Validation: SKU
    if (!sku || typeof sku !== "string" || sku.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Product SKU is required." },
        { status: 400 }
      );
    }

    // 3. Validation: Price
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a valid positive number greater than 0." },
        { status: 400 }
      );
    }

    // 4. Validation: Stock Quantity
    const parsedStock = parseInt(stockQuantity, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return NextResponse.json(
        { success: false, error: "Stock quantity must be a non-negative integer (0 or greater)." },
        { status: 400 }
      );
    }

    const cleanSku = sku.trim().toUpperCase();
    const cleanName = name.trim();

    //  Prevent duplicate SKU check
    const existingSku = await pool.query(
      `SELECT id FROM products WHERE UPPER(sku) = $1 LIMIT 1;`, //Compare it with the first parameter supplied to the query.
      [cleanSku]
    );

    if (existingSku.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `Product with SKU "${cleanSku}" already exists. SKUs must be unique.` },
        { status: 400 }
      );
    }

    // 6. Insert new product
    const insertRes = await pool.query(
      `INSERT INTO products (name, sku, price, stock_quantity)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, sku, price, stock_quantity AS "stockQuantity", created_at AS "createdAt";`,
      [cleanName, cleanSku, parsedPrice.toFixed(2), parsedStock]
    );

    const newProduct = insertRes.rows[0];

    // 7. Log inventory movement (Bonus Feature #4)
    await pool.query(
      `INSERT INTO inventory_logs (product_id, product_name, change_type, quantity_change, resulting_stock, reference_id, note)
       VALUES ($1, $2, 'INITIAL_STOCK', $3, $3, 'Product Created', 'Initial stock on creation');`,
      [newProduct.id, newProduct.name, parsedStock]
    );

    return NextResponse.json(
      { success: true, message: "Product created successfully!", product: newProduct },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.code === "23505") {
      // Postgres unique constraint violation
      return NextResponse.json(
        { success: false, error: "Product SKU already exists. SKUs must be unique." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create product: " + error.message },
      { status: 500 }
    );
  }
}
