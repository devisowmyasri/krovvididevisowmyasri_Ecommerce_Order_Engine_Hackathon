const auditLogger = require('./AuditLogger');

class FraudService {
  constructor() {
    this.userOrders = new Map(); // userId -> { count, lastReset }
    this.resetTime = 60000; // 1 minute window (Task 17)
    this.highValueThreshold = 500000; // Increase to 5L for testing (Task 17)
  }

  isFraudulent(userId, totalAmount) {
    const now = Date.now();
    let userData = this.userOrders.get(userId) || { count: 0, lastReset: now };

    // 1. Velocity Check (Task 17)
    if (now - userData.lastReset > this.resetTime) {
      userData.count = 0;
      userData.lastReset = now;
    }

    userData.count++;
    this.userOrders.set(userId, userData);

    if (userData.count > 3) {
      auditLogger.log('FRAUD_VELOCITY_ALERT', userId, { orderCount: userData.count });
      console.warn(`[Fraud] User ${userId} flagged for too many orders (Velocity)!`);
      return true;
    }

    // 2. High-Value Check (Task 17)
    if (totalAmount > this.highValueThreshold) {
      auditLogger.log('FRAUD_VALUE_ALERT', userId, { totalAmount });
      console.warn(`[Fraud] High-value order suspicious: ₹${totalAmount}!`);
      return true;
    }

    return false;
  }
}

module.exports = new FraudService();
