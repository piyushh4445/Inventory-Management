import { pool } from "./index.js";

/**
 * Auto-initializes PostgreSQL tables if they do not exist
 * and inserts default seed products.
 * This ensures the application works immediately upon connection!
 */
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // 1. Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL UNIQUE,
        price NUMERIC(10, 2) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Placed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL
      );
    `);

    // 4. Create inventory_logs table (Bonus: Stock Movement History)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        change_type VARCHAR(50) NOT NULL,
        quantity_change INTEGER NOT NULL,
        resulting_stock INTEGER NOT NULL,
        reference_id VARCHAR(100),
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      DO $$
      DECLARE
        table_to_migrate TEXT;
      BEGIN
        FOREACH table_to_migrate IN ARRAY ARRAY['products', 'orders', 'inventory_logs']
        LOOP
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = table_to_migrate
              AND column_name = 'created_at'
              AND data_type = 'timestamp without time zone'
          ) THEN
            EXECUTE format(
              'ALTER TABLE %I ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE %L',
              table_to_migrate,
              'UTC'
            );
          END IF;
        END LOOP;
      END $$;
    `);

    // 5. Seed initial products if table is empty
    const checkRes = await client.query(`SELECT COUNT(*) FROM products;`);
    const count = parseInt(checkRes.rows[0].count, 10);

    if (count === 0) {
      console.log("Seeding initial products into PostgreSQL...");
      const sampleProducts = [
        { name: "Wireless Ergonomic Mouse", sku: "MOU-WIR-001", price: "29.99", stock: 10 },
        { name: "Mechanical Gaming Keyboard", sku: "KEY-MEC-002", price: "79.99", stock: 15 },
        { name: "USB-C Fast Charging Cable", sku: "CAB-USBC-003", price: "12.50", stock: 25 },
        { name: "Aluminum Laptop Stand", sku: "STD-LAP-004", price: "45.00", stock: 8 },
        { name: "Noise-Cancelling Headphones", sku: "AUD-NCH-005", price: "149.99", stock: 5 },
      ];

      for (const p of sampleProducts) {
        const insertRes = await client.query(
          `INSERT INTO products (name, sku, price, stock_quantity)
           VALUES ($1, $2, $3, $4) RETURNING id;`,
          [p.name, p.sku, p.price, p.stock]
        );
        const newId = insertRes.rows[0].id;

        // Log initial stock movement
        await client.query(
          `INSERT INTO inventory_logs (product_id, product_name, change_type, quantity_change, resulting_stock, reference_id, note)
           VALUES ($1, $2, 'INITIAL_STOCK', $3, $3, 'Initial Seed', 'Initial stock added');`,
          [newId, p.name, p.stock]
        );
      }
      console.log("Default products seeded successfully!");
    }

    return { success: true, message: "Database initialized successfully" };
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  } finally {
    client.release();
  }
}
