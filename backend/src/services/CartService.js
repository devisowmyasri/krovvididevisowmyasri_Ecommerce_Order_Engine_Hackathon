const productService = require('./ProductService');
const auditLogger = require('./AuditLogger');
const eventBus = require('./EventBus');
const locker = require('../utils/Locker');

class CartService {
  constructor() {
    this.carts = new Map(); // userId -> Map(productId -> quantity)
    this.reservations = new Map(); // userId -> Map(productId -> { quantity, timeoutId })
    this.reservationTTL = 120000; // 120 seconds (2 mins) as requested
  }

  async addToCart(userId, productId, quantity) {
    await locker.acquire(productId);
    try {
      const product = productService.getProduct(productId);
      if (!product) throw new Error('Product not found');
      if (product.stock < quantity) throw new Error('Insufficient stock for reservation');

      // 1. Reserve stock
      product.stock -= quantity;
      this.reserve(userId, productId, quantity);

      // 2. Add to cart
      let userCart = this.carts.get(userId) || new Map();
      userCart.set(productId, (userCart.get(productId) || 0) + quantity);
      this.carts.set(userId, userCart);

      auditLogger.log('ADD_TO_CART', userId, { productId, quantity });
      await eventBus.emitEvent('CART_UPDATED', { userId, productId, quantity });
    } finally {
      locker.release(productId);
    }
  }

  reserve(userId, productId, quantity) {
    let userReservations = this.reservations.get(userId) || new Map();
    
    // If already exists, clear old timeout
    if (userReservations.has(productId)) {
      clearTimeout(userReservations.get(productId).timeoutId);
    }

    const timeoutId = setTimeout(() => {
      this.releaseReservation(userId, productId);
    }, this.reservationTTL);

    userReservations.set(productId, { quantity, timeoutId });
    this.reservations.set(userId, userReservations);
    console.log(`[CartService] Reserved ${quantity} of ${productId} for ${userId}. Expires in 30s.`);
  }

  async releaseReservation(userId, productId) {
    const userReservations = this.reservations.get(userId);
    if (!userReservations || !userReservations.has(productId)) return;

    const { quantity, timeoutId } = userReservations.get(productId);
    clearTimeout(timeoutId);
    userReservations.delete(productId);

    // Restore stock
    const product = productService.getProduct(productId);
    if (product) {
      product.stock += quantity;
      console.log(`[CartService] Reservation expired. Restored ${quantity} of ${productId} to stock.`);
      await eventBus.emitEvent('INVENTORY_UPDATED', { productId, stock: product.stock });
    }

    // Remove from cart too
    let userCart = this.carts.get(userId);
    if (userCart) {
      userCart.delete(productId);
    }

    auditLogger.log('RESERVATION_EXPIRED', userId, { productId, quantity });
  }

  async removeFromCart(userId, productId) {
    const userCart = this.carts.get(userId);
    if (!userCart || !userCart.has(productId)) return;

    const quantity = userCart.get(productId);
    userCart.delete(productId);
    
    // Release reservation
    const userReservations = this.reservations.get(userId);
    if (userReservations && userReservations.has(productId)) {
      clearTimeout(userReservations.get(productId).timeoutId);
      userReservations.delete(productId);
    }

    // Restore stock
    const product = productService.getProduct(productId);
    if (product) product.stock += quantity;

    auditLogger.log('REMOVE_FROM_CART', userId, { productId, quantity });
    await eventBus.emitEvent('CART_UPDATED', { userId, productId, quantity: 0 });
    await eventBus.emitEvent('INVENTORY_UPDATED', { productId, stock: product.stock });
  }

  getCart(userId) {
    const cart = this.carts.get(userId);
    if (!cart) return [];
    return Array.from(cart.entries()).map(([id, qty]) => ({ productId: id, quantity: qty }));
  }

  clearCart(userId) {
    // During order creation, we clear it.
    // We must NOT restore stock here because the stock is now "consumed" by the order.
    const userReservations = this.reservations.get(userId);
    if (userReservations) {
      for (let [pid, res] of userReservations) {
        clearTimeout(res.timeoutId);
      }
      this.reservations.delete(userId);
    }
    this.carts.delete(userId);
  }
}

module.exports = new CartService();
