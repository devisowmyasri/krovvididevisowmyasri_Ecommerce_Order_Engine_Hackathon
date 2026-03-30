const auditLogger = require('./AuditLogger');
const eventBus = require('./EventBus');
const failureInjector = require('../utils/FailureInjector');

class PaymentService {
  constructor() {
    this.processedTransactions = new Set();
  }

  async processPayment(transactionId, amount) {
    // 1. Idempotency Check (Task 19)
    if (this.processedTransactions.has(transactionId)) {
      console.log(`[Payment] Idempotent hit: ${transactionId} already processed.`);
      return true;
    }

    // 2. Failure Injection (Task 6, 18)
    if (failureInjector.shouldFail('PAYMENT')) {
      throw new Error('Payment gateway timeout');
    }

    // 3. Simulation delay
    console.log(`[Payment] Processing ₹${amount} for ${transactionId}...`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Record success
    this.processedTransactions.add(transactionId);
    auditLogger.log('PAYMENT_SUCCESS', 'SYSTEM', { transactionId, amount });
    await eventBus.emitEvent('PAYMENT_SUCCESS', { transactionId, amount });

    return true;
  }

  refund(transactionId) {
    if (this.processedTransactions.has(transactionId)) {
      this.processedTransactions.delete(transactionId);
      console.log(`[Payment] Refunded: ${transactionId}`);
      auditLogger.log('REFUND_PROCESSED', 'SYSTEM', { transactionId });
    }
  }
}

module.exports = new PaymentService();
