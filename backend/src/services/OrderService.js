const cartService = require('./CartService');
const productService = require('./ProductService');
const paymentService = require('./PaymentService');
const discountService = require('./DiscountService');
const auditLogger = require('./AuditLogger');
const eventBus = require('./EventBus');
const transactionManager = require('../utils/TransactionManager');

class OrderService {
  constructor() {
    this.orders = new Map();
    this.orderIdCounter = 1000;
  }

  async placeOrder(userId, couponCode = null) {
    const orderId = `ORD-${this.orderIdCounter++}`;
    const cartItemsEntries = cartService.getCart(userId);
    
    if (cartItemsEntries.length === 0) throw new Error('Cart is empty');

    // Prepare full data for items
    const cartItems = cartItemsEntries.map(entry => {
      const p = productService.getProduct(entry.productId);
      return { ...p, quantity: entry.quantity };
    });

    const totalBeforeDiscount = cartItems.reduce((acc, current) => acc + (current.price * current.quantity), 0);
    const discount = discountService.calculateDiscount(userId, cartItems, totalBeforeDiscount, couponCode);
    const finalAmount = totalBeforeDiscount - discount;

    const steps = [
      {
        name: 'VALIDATE_AND_LOCK_STOCK',
        action: async () => {
          // Stock was already reserved during add-to-cart in CartService,
          // so we just "consume" it.
          console.log(`[Order] Stock confirmed for ${orderId}`);
          return true;
        },
        undo: async () => {
          // If order fails later, CartService would normally restore stock,
          // but we'll manually ensure it here too via restore mechanism.
          cartItems.forEach(item => {
            productService.updateStock(item.id, item.quantity);
          });
        }
      },
      {
        name: 'CREATE_ORDER',
        action: async () => {
          const order = {
            id: orderId, userId, items: cartItems, 
            total: finalAmount, state: 'CREATED', 
            createdAt: new Date().toISOString()
          };
          this.orders.set(orderId, order);
          auditLogger.log('ORDER_CREATED', userId, { orderId, total: finalAmount });
          await eventBus.emitEvent('ORDER_CREATED', { orderId });
        },
        undo: async () => {
          this.orders.delete(orderId);
        }
      },
      {
        name: 'PROCESS_PAYMENT',
        action: async () => {
          this.updateState(orderId, 'PENDING_PAYMENT');
          await paymentService.processPayment(orderId, finalAmount);
          this.updateState(orderId, 'PAID');
        },
        undo: async () => {
          this.updateState(orderId, 'FAILED');
          paymentService.refund(orderId);
        }
      },
      {
        name: 'CLEAR_CART',
        action: async () => {
          cartService.clearCart(userId);
          console.log(`[Order] Cart cleared for user ${userId}`);
        },
        undo: async () => {
          // In a real system, you might want to restore the cart.
          // For simplicity, we won't here, but stock is already handled.
        }
      }
    ];

    try {
      await transactionManager.run(orderId, steps);
      this.updateState(orderId, 'PAID');
    } catch (error) {
      console.error(`[Order] Order placement failed for ${orderId}: ${error.message}`);
      throw error;
    }

    return this.orders.get(orderId);
  }

  updateState(orderId, newState) {
    const order = this.orders.get(orderId);
    if (!order) return;

    const validTransitions = {
      'CREATED': ['PENDING_PAYMENT', 'CANCELLED', 'FAILED'],
      'PENDING_PAYMENT': ['PAID', 'FAILED', 'CANCELLED'],
      'PAID': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED'],
      'DELIVERED': ['RETURNED'],
      'FAILED': [],
      'CANCELLED': [],
      'RETURNED': []
    };

    if (validTransitions[order.state].includes(newState)) {
      const oldState = order.state;
      order.state = newState;
      console.log(`[OrderState] ${orderId}: ${oldState} -> ${newState}`);
      auditLogger.log('ORDER_STATE_CHANGED', order.userId, { orderId, oldState, newState });
      eventBus.emitEvent('ORDER_STATE_UPDATED', { orderId, state: newState });
    } else {
      console.error(`[OrderState] Invalid transition: ${order.state} -> ${newState}`);
    }
  }

  async cancelOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.state === 'CANCELLED') throw new Error('Order already cancelled');

    this.updateState(orderId, 'CANCELLED');
    // Restore stock
    for (const item of order.items) {
      await productService.updateStock(item.id, item.quantity);
    }
    auditLogger.log('ORDER_CANCELLED', order.userId, { orderId });
  }

  async returnProduct(orderId, productId, quantity) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.state !== 'DELIVERED') throw new Error('Only delivered orders can be returned');

    const item = order.items.find(i => i.id === productId);
    if (!item) throw new Error('Product not in order');
    if (quantity > item.quantity) throw new Error('Return quantity exceeds order quantity');

    // Update stock
    await productService.updateStock(productId, quantity);
    
    // Update order (partial return simulation)
    const refundAmount = item.price * quantity;
    order.total -= refundAmount;
    item.quantity -= quantity;
    
    if (order.items.reduce((acc, curr) => acc + curr.quantity, 0) === 0) {
      this.updateState(orderId, 'RETURNED');
    }

    auditLogger.log('RETURN_PROCESSED', order.userId, { orderId, productId, quantity, refundAmount });
    console.log(`[Order] Return processed. Refunded: ₹${refundAmount}`);
  }

  getOrders(filter = {}) {
    let results = Array.from(this.orders.values());
    if (filter.status) {
      results = results.filter(o => o.state === filter.status);
    }
    if (filter.id) {
      results = results.filter(o => o.id === filter.id);
    }
    return results;
  }
}

module.exports = new OrderService();
