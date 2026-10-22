# Mini E-Commerce Order Management System (OMS)

**Role:** Software Engineering Intern  
**Tech Stack:** Next.js (App Router, JavaScript), PostgreSQL, Drizzle ORM, Tailwind CSS  
**Assignment Type:** Practical Intern Assessment  

---

## 📌 Project Overview
This is a full-stack e-commerce order management system where an administrator can manage catalog products, track real-time stock levels, place multi-item customer orders with atomic inventory deduction, and cancel orders with automatic inventory restoration.

Built cleanly with **pure JavaScript**, **Next.js**, **PostgreSQL**, and **Drizzle ORM** following beginner-friendly yet robust engineering practices.

---

## 🌟 Implemented Features

### 1. Product & Inventory Management (`/`)
- View all products in a structured, readable table.
- **Fields:** Product Name, Unique SKU, Price ($), Available Stock Quantity, Stock Status.
- **Add Product:** Form to register new products with real-time validation.
- **Update Stock:** Modal to directly adjust inventory levels.
- Real-time stock reflection whenever orders are placed or cancelled.

### 2. Create Order (`/orders/new`)
- Enter customer name.
- Select multiple products via dynamic line items.
- Real-time display of unit prices, line item subtotals, and overall order grand total.
- **Strict All-or-Nothing Atomic Stock Check:**
  - Validates positive quantities (> 0).
  - Checks stock availability for **every product** inside a PostgreSQL database transaction (`BEGIN ... COMMIT`).
  - **If ANY product has insufficient stock, the entire order is rejected** and rolled back. No partial deductions occur.
- Success confirmation banner displaying Order ID, Customer Name, and Total.

### 3. Order Management & Cancellation (`/orders`)
- Order listing table displaying: Order ID, Customer Name, Number of Items, Order Total, Order Status, and Timestamp.
- **View Order Details:** Modal showing each item purchased, SKU, unit price, quantity, and subtotal.
- **Order Cancellation:**
  - Restores the quantities of all products back to inventory.
  - Updates order status to `Cancelled`.
  - **Double Cancellation Guard:** Prevents the same order from being cancelled twice, guaranteeing stock is never restored multiple times.

### 4. Selected Bonus Features (4 Implemented)
1. **Prevent Duplicate SKUs:** Enforced at both the database level (`UNIQUE` constraint) and API level with clear user feedback.
2. **Product Search & Stock Filter:** Real-time search by product name/SKU and filtering by *All*, *In Stock*, or *Out of Stock*.
3. **Order Status Filter & Search:** Filter orders by *All*, *Placed*, or *Cancelled*, plus search by customer name or Order ID.
4. **Inventory Movement History / Audit Log (`/inventory-logs`):** Full audit trail recording initial stock additions, order deductions, manual adjustments, and cancellation restocks.
5. **Automated Acceptance Test Suite (`scripts/test-scenarios.js`):** Script to automatically test and verify all 7 acceptance scenarios.

---

## 🗄️ Database Connection Process (PostgreSQL + Drizzle ORM)

Here is how the database connection and schema work step-by-step:

### Step 1: Connection Configuration (`.env.local`)
Create a `.env.local` file in the project root:
```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce_oms"

# OR Free Cloud PostgreSQL (e.g., Neon.tech / Supabase / Aiven - No installation required!)
# DATABASE_URL="postgresql://username:password@ep-sample.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Step 2: Drizzle ORM Schema Definition (`src/db/schema.js`)
Drizzle tables are defined using `drizzle-orm/pg-core`:
- `products`: id, name, sku (unique), price, stock_quantity, created_at
- `orders`: id, customer_name, total_amount, status ('Placed', 'Cancelled'), created_at
- `order_items`: id, order_id (foreign key), product_id, product_name, product_sku, quantity, unit_price, subtotal
- `inventory_logs`: id, product_id, product_name, change_type, quantity_change, resulting_stock, reference_id, note, created_at

### Step 3: Connection Pool (`src/db/index.js`)
We use `pg.Pool` with `drizzle(pool, { schema })`. In development, the pool instance is cached on `globalThis` to prevent connection leaks during Next.js hot reloads.

### Step 4: Automatic Table Creation & Seeding
The application includes an auto-initialization endpoint (`/api/init`) and script (`src/db/init.js`). As soon as PostgreSQL is connected:
1. It runs `CREATE TABLE IF NOT EXISTS` for all tables.
2. If the products table is empty, it automatically seeds 5 realistic products (e.g. Wireless Ergonomic Mouse with 10 units in stock).

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
Make sure PostgreSQL is running, create the database `ecommerce_oms`, and set `DATABASE_URL` in `.env.local`:
```bash
# If using psql:
CREATE DATABASE ecommerce_oms;
```
*(Alternatively, use a free instant cloud database from Neon.tech and paste its URL into `.env.local`)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The green badge in the top navigation will confirm database connection!

### 4. Run Acceptance Scenario Test Suite
With the app running, execute the automated test runner in another terminal:
```bash
npm run test:scenarios
```

---

## 🧪 Acceptance Scenarios Verification

| Scenario | Expected Outcome | Handled By |
|---|---|---|
| **1. Order 3 from 10 stock** | Stock becomes 7 | Transaction decrements stock by 3 |
| **2. Order 11 from 10 stock** | Order rejected with 400; stock remains 10 | Stock check fails before deduction; transaction rolls back |
| **3. Multi-item order with 1 item out of stock** | Entire order rejected; no items deducted | Database transaction aborts with `ROLLBACK` |
| **4. Cancel placed order** | Stock restored for all order items | Transaction increments stock by purchased quantity |
| **5. Cancel same order twice** | Second attempt rejected with 400; stock NOT restored twice | Order status check rejects non-'Placed' orders |
| **6. Invalid quantities (<= 0)** | Rejected with 400 | Validation rejects zero/negative/non-integer values |
| **7. Server restart / refresh** | Data persists | PostgreSQL tables retain all products, orders, and logs |

---

## 🛡️ Preventing Negative Stock (Intern Explanation)
1. **Row-level locking (`SELECT ... FOR UPDATE`):** When placing an order, products are locked within a PostgreSQL transaction to prevent race conditions from concurrent orders.
2. **Pre-check against available stock:** Before inserting order items, the system verifies `product.stock_quantity >= item.quantity`.
3. **Database Transaction Rollback:** If any single item in the order lacks sufficient stock, a `ROLLBACK` is issued immediately. This ensures zero partial stock deductions.
