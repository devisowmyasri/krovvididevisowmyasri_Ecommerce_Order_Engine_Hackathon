const auditLogger = require('../services/AuditLogger');

class TransactionManager {
  constructor() {
    this.transactions = new Map();
  }

  async run(transactionId, steps) {
    const executedSteps = [];
    console.log(`[TransactionManager] Running transaction ${transactionId}...`);

    for (const step of steps) {
      try {
        console.log(`[TransactionManager] Executing: ${step.name}`);
        const result = await step.action();
        executedSteps.push(step);
      } catch (error) {
        console.error(`[TransactionManager] Error in ${step.name}: ${error.message}`);
        await this.rollback(transactionId, executedSteps);
        throw error;
      }
    }

    console.log(`[TransactionManager] Transaction ${transactionId} finished successfully.`);
  }

  async rollback(transactionId, executedSteps) {
    console.warn(`[TransactionManager] Rolling back transaction ${transactionId}...`);
    // Rollback in reverse order
    for (let i = executedSteps.length - 1; i >= 0; i--) {
      const step = executedSteps[i];
      if (step.undo) {
        try {
          console.log(`[TransactionManager] Undoing: ${step.name}`);
          await step.undo();
        } catch (undoError) {
          console.error(`[TransactionManager] Undo error for ${step.name}: ${undoError.message}`);
          // In real production, this would go into a recovery queue
        }
      }
    }
    auditLogger.log('TRANSACTION_ROLLBACK', 'SYSTEM', { transactionId });
  }
}

module.exports = new TransactionManager();
