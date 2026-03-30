const inquirer = require('inquirer');
const chalk = require('chalk');
const productService = require('./src/services/ProductService');
const cartService = require('./src/services/CartService');
const orderService = require('./src/services/OrderService');
const discountService = require('./src/services/DiscountService');
const auditLogger = require('./src/services/AuditLogger');
const failureInjector = require('./src/utils/FailureInjector');
const fraudService = require('./src/services/FraudService');

// Start API Server in background for Frontend
require('./src/api');

const currentUser = 'USER_1';

async function mainMenu() {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: chalk.cyan('Distributed E-Commerce Order Engine (CLI)'),
      choices: [
        '1. Add Product',
        '2. View Products',
        '3. Add to Cart',
        '4. Remove from Cart',
        '5. View Cart',
        '6. Apply Coupon',
        '7. Place Order',
        '8. Cancel Order',
        '9. View Orders',
        '10. Low Stock Alert',
        '11. Return Product',
        '12. Simulate Concurrent Users',
        '13. View Logs',
        '14. Trigger Failure Mode',
        '0. Exit'
      ]
    }
  ]);

  switch (choice.split('.')[0]) {
    case '1': await addProduct(); break;
    case '2': await viewProducts(); break;
    case '3': await addToCart(); break;
    case '4': await removeFromCart(); break;
    case '5': await viewCart(); break;
    case '6': console.log('Apply coupon logic integrated in Place Order'); break;
    case '7': await placeOrder(); break;
    case '8': await cancelOrder(); break;
    case '9': await viewOrders(); break;
    case '10': await lowStockAlert(); break;
    case '11': await returnProduct(); break;
    case '12': await simulateConcurrency(); break;
    case '13': await viewLogs(); break;
    case '14': await toggleFailureMode(); break;
    case '0': process.exit();
  }
  mainMenu();
}

async function addProduct() {
  const answers = await inquirer.prompt([
    { name: 'id', message: 'Enter Product ID (e.g. P1):' },
    { name: 'name', message: 'Enter Name:' },
    { name: 'price', message: 'Enter Price:', type: 'number' },
    { name: 'stock', message: 'Enter Stock:', type: 'number' }
  ]);
  try {
    await productService.addProduct(answers.id, answers.name, answers.price, answers.stock);
    console.log(chalk.green('Product added successfully!'));
  } catch (e) { console.error(chalk.red(e.message)); }
}

async function viewProducts() {
  const products = productService.getAllProducts();
  console.table(products);
}

async function addToCart() {
  const answers = await inquirer.prompt([
    { name: 'productId', message: 'Enter Product ID:' },
    { name: 'quantity', message: 'Enter Quantity:', type: 'number' }
  ]);
  try {
    await cartService.addToCart(currentUser, answers.productId, answers.quantity);
    console.log(chalk.green('Reserved & Added to cart! (Expires in 120s)'));
  } catch (e) { console.error(chalk.red(e.message)); }
}

async function viewCart() {
  const cart = cartService.getCart(currentUser);
  console.log(chalk.yellow('--- Current Cart ---'));
  console.table(cart);
}

async function placeOrder() {
  const { coupon } = await inquirer.prompt([{ name: 'coupon', message: 'Enter Coupon (optional):' }]);
  try {
    // Fraud Check
    const cart = cartService.getCart(currentUser);
    const total = cart.reduce((acc, curr) => {
      const p = productService.getProduct(curr.productId);
      return acc + (p.price * curr.quantity);
    }, 0);

    if (fraudService.isFraudulent(currentUser, total)) {
      console.log(chalk.red('Order blocked by Fraud Detection!'));
      return;
    }

    const order = await orderService.placeOrder(currentUser, coupon);
    console.log(chalk.green(`Order Placed! ID: ${order.id}. State: ${order.state}`));
  } catch (e) { console.error(chalk.red('Order construction aborted: ' + e.message)); }
}

async function viewOrders() {
  const orders = orderService.getOrders();
  console.table(orders.map(o => ({ id: o.id, state: o.state, total: o.total })));
}

async function simulateConcurrency() {
  console.log(chalk.magenta('Starting Concurrency Simulation...'));
  console.log(chalk.gray('Case: 3 users trying to buy the same product with limited stock.'));
  
  // Setup: Product P-CON with stock 1
  try {
    await productService.addProduct('P-CON', 'Scarce Item', 500, 1);
  } catch (e) {}

  const simUsers = ['U1', 'U2', 'U3'];
  const promises = simUsers.map(u => 
    cartService.addToCart(u, 'P-CON', 1)
      .then(() => console.log(chalk.green(`[CON] SUCCESS: ${u} got the item!`)))
      .catch(e => console.log(chalk.red(`[CON] FAILED: ${u} - ${e.message}`)))
  );

  await Promise.all(promises);
}

async function toggleFailureMode() {
  const { threshold } = await inquirer.prompt([{ name: 'threshold', message: 'Enter Failure Rate (0-1):', default: '0.5' }]);
  failureInjector.setThreshold(parseFloat(threshold));
  console.log(chalk.yellow(`Failure injection threshold set to ${threshold}`));
}

async function viewLogs() {
  const logs = auditLogger.getLogs();
  logs.forEach(l => console.log(chalk.gray(l)));
}

async function lowStockAlert() {
  const alerts = productService.getLowStockAlerts();
  console.table(alerts);
}

async function cancelOrder() {
  const { id } = await inquirer.prompt([{ name: 'id', message: 'Enter Order ID:' }]);
  try {
    await orderService.cancelOrder(id);
    console.log(chalk.green('Order cancelled and stock restored.'));
  } catch (e) { console.error(chalk.red(e.message)); }
}

async function returnProduct() {
  const { oid, pid, qty } = await inquirer.prompt([
    { name: 'oid', message: 'Enter Order ID:' },
    { name: 'pid', message: 'Product ID to return:' },
    { name: 'qty', message: 'Quantity:', type: 'number' }
  ]);
  try {
    await orderService.returnProduct(oid, pid, qty);
    console.log(chalk.green('Return processed. Stock restored.'));
  } catch (e) { console.error(chalk.red(e.message)); }
}

async function removeFromCart() {
  const { pid } = await inquirer.prompt([{ name: 'pid', message: 'Product ID:' }]);
  await cartService.removeFromCart(currentUser, pid);
  console.log(chalk.green('Removed and stock restored.'));
}

mainMenu();
