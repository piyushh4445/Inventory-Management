/**
 * Acceptance Scenarios Automated Verification Script
 * Tests all core requirements and acceptance cases against the Next.js API server.
 * Run with: npm run test:scenarios
 */

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

let passedCount = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`  MINI E-COMMERCE OMS - ACCEPTANCE SCENARIO TEST SUITE`);
  console.log(`  Target Server: ${BASE_URL}`);
  console.log(`======================================================\n`);

  try {
    // 0. Ensure Database is initialized
    console.log(`[0] Checking DB connection and initializing tables...`);
    const initRes = await fetch(`${BASE_URL}/api/init`);
    const initData = await initRes.json();
    assert(initRes.ok && initData.connected, "Database connected and initialized successfully");

    // Fetch existing products
    const prodRes = await fetch(`${BASE_URL}/api/products`);
    const prodData = await prodRes.json();
    assert(prodData.products && prodData.products.length > 0, "Initial product catalog loaded");

    // Pick or create a dedicated test product with 10 units in stock
    const testSku = `TEST-ITEM-${Date.now()}`;
    const createProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Bluetooth Speaker",
        sku: testSku,
        price: "49.99",
        stockQuantity: 10,
      }),
    });
    const createdProdData = await createProdRes.json();
    const testProd1 = createdProdData.product;
    console.log(`  Created test product "${testProd1.name}" (ID: ${testProd1.id}) with 10 stock.`);

    // Scenario 1: Product with 10 units in stock ordered for 3. Stock becomes 7.
    console.log(`\n[Scenario 1] Ordering 3 units of product with 10 stock...`);
    const order1Res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Alice Scenario 1",
        items: [{ productId: testProd1.id, quantity: 3 }],
      }),
    });
    const order1Data = await order1Res.json();
    assert(order1Res.ok && order1Data.success, "Order for 3 units placed successfully");

    // Verify stock became 7
    const verifyStock1Res = await fetch(`${BASE_URL}/api/products?search=${testSku}`);
    const verifyStock1Data = await verifyStock1Res.json();
    const updatedProd1 = verifyStock1Data.products.find((p) => p.id === testProd1.id);
    assert(
      updatedProd1 && updatedProd1.stockQuantity === 7,
      `Stock updated from 10 to 7 (Actual: ${updatedProd1?.stockQuantity})`
    );

    // Scenario 2: Order for 11 units rejected when only 7 (or 10) are available. Stock unchanged.
    console.log(`\n[Scenario 2] Ordering 11 units when only 7 available (Must reject)...`);
    const order2Res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Bob Scenario 2",
        items: [{ productId: testProd1.id, quantity: 11 }],
      }),
    });
    const order2Data = await order2Res.json();
    assert(order2Res.status === 400, "Order for 11 units was rejected with HTTP 400");
    assert(!order2Data.success && order2Data.error.includes("Insufficient stock"), "Returned meaningful insufficient stock error message");

    // Verify stock remains 7
    const verifyStock2Res = await fetch(`${BASE_URL}/api/products?search=${testSku}`);
    const verifyStock2Data = await verifyStock2Res.json();
    const unchangedProd1 = verifyStock2Data.products.find((p) => p.id === testProd1.id);
    assert(
      unchangedProd1 && unchangedProd1.stockQuantity === 7,
      `Stock remains unchanged at 7 (Actual: ${unchangedProd1?.stockQuantity})`
    );

    // Scenario 3: Order containing two products rejected ENTIRELY if either has insufficient stock
    console.log(`\n[Scenario 3] Two-product order where 1 product has insufficient stock...`);
    // Create second product with 2 units in stock
    const testSku2 = `TEST-ITEM-2-${Date.now()}`;
    const createProd2Res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test USB Hub",
        sku: testSku2,
        price: "19.99",
        stockQuantity: 2,
      }),
    });
    const testProd2 = (await createProd2Res.json()).product;

    const order3Res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Charlie Scenario 3",
        items: [
          { productId: testProd1.id, quantity: 2 }, // Valid (7 available)
          { productId: testProd2.id, quantity: 5 }, // Invalid (only 2 available!)
        ],
      }),
    });
    const order3Data = await order3Res.json();
    assert(order3Res.status === 400, "Entire multi-product order was rejected with HTTP 400");
    
    // Verify NEITHER product had its stock reduced
    const checkStockP1 = (await (await fetch(`${BASE_URL}/api/products?search=${testSku}`)).json()).products.find((p) => p.id === testProd1.id);
    const checkStockP2 = (await (await fetch(`${BASE_URL}/api/products?search=${testSku2}`)).json()).products.find((p) => p.id === testProd2.id);
    assert(
      checkStockP1.stockQuantity === 7 && checkStockP2.stockQuantity === 2,
      `Neither product stock reduced: Prod1=${checkStockP1.stockQuantity} (expected 7), Prod2=${checkStockP2.stockQuantity} (expected 2)`
    );

    // Scenario 4: Cancelling placed order restores stock for all items
    console.log(`\n[Scenario 4] Cancelling placed Order #${order1Data.order.id}...`);
    const cancelRes = await fetch(`${BASE_URL}/api/orders/${order1Data.order.id}/cancel`, {
      method: "POST",
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.ok && cancelData.success, "Order cancelled successfully");

    // Verify stock of product 1 was restored by 3 (7 + 3 = 10)
    const restoredProd1 = (await (await fetch(`${BASE_URL}/api/products?search=${testSku}`)).json()).products.find((p) => p.id === testProd1.id);
    assert(
      restoredProd1.stockQuantity === 10,
      `Stock fully restored back to 10 (Actual: ${restoredProd1.stockQuantity})`
    );

    // Scenario 5: Cancelling same order twice does NOT restore stock twice
    console.log(`\n[Scenario 5] Attempting to cancel already cancelled Order #${order1Data.order.id}...`);
    const doubleCancelRes = await fetch(`${BASE_URL}/api/orders/${order1Data.order.id}/cancel`, {
      method: "POST",
    });
    const doubleCancelData = await doubleCancelRes.json();
    assert(doubleCancelRes.status === 400, "Second cancellation rejected with HTTP 400");
    assert(
      doubleCancelData.error.includes("already been cancelled"),
      "Helpful error returned preventing duplicate stock restoration"
    );

    // Verify stock is STILL 10 (not 13)
    const checkProdAgain = (await (await fetch(`${BASE_URL}/api/products?search=${testSku}`)).json()).products.find((p) => p.id === testProd1.id);
    assert(
      checkProdAgain.stockQuantity === 10,
      `Stock did not increase twice and remains 10 (Actual: ${checkProdAgain.stockQuantity})`
    );

    // Scenario 6: Invalid quantities (zero or negative) rejected
    console.log(`\n[Scenario 6] Submitting order with quantity <= 0 (e.g. -2, 0)...`);
    const invalidQtyRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "David Scenario 6",
        items: [{ productId: testProd1.id, quantity: -2 }],
      }),
    });
    assert(invalidQtyRes.status === 400, "Negative quantity rejected with HTTP 400");

    // Bonus Scenario: Prevent duplicate SKU
    console.log(`\n[Bonus] Testing Duplicate SKU Prevention...`);
    const duplicateSkuRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate SKU Item",
        sku: testSku, // Existing SKU
        price: "15.00",
        stockQuantity: 5,
      }),
    });
    assert(duplicateSkuRes.status === 400, "Duplicate SKU rejected with HTTP 400");

    // Summary
    console.log(`\n======================================================`);
    console.log(`  TEST RESULTS: ${passedCount} / ${totalTests} PASSED`);
    if (passedCount === totalTests) {
      console.log(`  🎉 ALL ACCEPTANCE SCENARIOS VERIFIED SUCCESSFULLY!`);
    } else {
      console.log(`  ⚠️ SOME TESTS FAILED`);
    }
    console.log(`======================================================\n`);
  } catch (error) {
    if (error?.cause?.code === "ECONNREFUSED" || error?.message?.includes("fetch failed")) {
      console.error(`\n⚠️  SERVER NOT RUNNING ON ${BASE_URL}!`);
      console.error(`👉  Please start the Next.js server first in a separate terminal:`);
      console.error(`    npm run dev`);
      console.error(`👉  Once the server is running on http://localhost:3000, run this test in another terminal:\n    npm run test:scenarios\n`);
    } else {
      console.error("Test execution error:", error);
    }
  }
}

runTests();
