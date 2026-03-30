const auditLogger = require('./AuditLogger');
const eventBus = require('./EventBus');
const locker = require('../utils/Locker');

class ProductService {
  constructor() {
    this.products = new Map();
    this.lowStockThreshold = 5;
  }

  async addProduct(id, name, price, stock) {
    if (this.products.has(id)) {
      throw new Error(`Product ${id} already exists.`);
    }
    if (stock < 0) throw new Error('Stock cannot be negative');
    
    this.products.set(id, { id, name, price, stock });
    auditLogger.log('ADD_PRODUCT', 'ADMIN', { id, name, price, stock });
    await eventBus.emitEvent('INVENTORY_UPDATED', { id, stock });
  }

  async updateStock(id, quantity) {
    await locker.acquire(id);
    try {
      const product = this.products.get(id);
      if (!product) throw new Error('Product not found');
      
      const newStock = product.stock + quantity;
      if (newStock < 0) throw new Error('Insufficient stock');
      
      product.stock = newStock;
      auditLogger.log('UPDATE_STOCK', 'SYSTEM', { id, quantity, newStock });
      await eventBus.emitEvent('INVENTORY_UPDATED', { id, stock: newStock });

      if (newStock <= this.lowStockThreshold) {
        console.warn(`[Alert] Product ${id} has low stock: ${newStock}`);
        await eventBus.emitEvent('LOW_STOCK_ALERT', { id, stock: newStock });
      }
    } finally {
      locker.release(id);
    }
  }

  getAllProducts() {
    return Array.from(this.products.values());
  }

  getProduct(id) {
    return this.products.get(id);
  }

  getLowStockAlerts() {
    return Array.from(this.products.values()).filter(p => p.stock <= this.lowStockThreshold);
  }

  seed() {
    // Only seed if empty
    if (this.products.size === 0) {
      this.addProduct('c1', 'Smart Cooker Pro', 4500, 50);
      this.addProduct('c2', 'iPhone 17 Pro Max', 150000, 10);
      this.addProduct('c3', 'Digital Watch', 2500, 100);
      this.addProduct('c4', 'Wireless Headphones', 7500, 25);
      console.log('[ProductService] Seeded data for shop.');
    }
  }
}

module.exports = new ProductService();
