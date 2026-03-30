const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const productService = require('./services/ProductService');
const orderService = require('./services/OrderService');
const cartService = require('./services/CartService');
const auditLogger = require('./services/AuditLogger');
const fraudService = require('./services/FraudService');
const failureInjector = require('./utils/FailureInjector');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 3001;

// Seed data on startup
productService.seed();

app.get('/', (req, res) => res.send('📦 E-Commerce Engine API is Live. Use http://localhost:5173 for the store.'));

// 1. Product Endpoints
app.get('/api/products', (req, res) => res.json(productService.getAllProducts()));
app.post('/api/products', (req, res) => {
  const { id, name, price, stock } = req.body;
  try {
    productService.addProduct(id, name, price, stock);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 2. Cart Endpoints (Simplified for USER_1 for this simulation)
app.get('/api/cart/:userId', (req, res) => res.json(cartService.getCart(req.params.userId)));
app.post('/api/cart/:userId', async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    await cartService.addToCart(req.params.userId, productId, quantity);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/cart/:userId/:productId', async (req, res) => {
  try {
    await cartService.removeFromCart(req.params.userId, req.params.productId);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 3. Order Endpoints
app.get('/api/orders', (req, res) => res.json(orderService.getOrders()));
app.post('/api/orders', async (req, res) => {
  const { userId, couponCode } = req.body;
  try {
    const cart = cartService.getCart(userId);
    const total = cart.reduce((acc, curr) => {
      const p = productService.getProduct(curr.productId);
      return acc + (p.price * curr.quantity);
    }, 0);

    if (fraudService.isFraudulent(userId, total)) {
      return res.status(403).json({ error: 'Order blocked by Fraud Detection velocity/value checks.' });
    }

    const order = await orderService.placeOrder(userId, couponCode);
    res.json(order);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 4. System & Simulation
app.get('/api/logs', (req, res) => res.json(auditLogger.getLogs()));
app.post('/api/failure-rate', (req, res) => {
  failureInjector.setThreshold(req.body.rate);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`[API Server] Running on http://localhost:${PORT}`));
