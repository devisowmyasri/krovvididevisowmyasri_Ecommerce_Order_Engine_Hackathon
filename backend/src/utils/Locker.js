class Locker {
  constructor() {
    this.locks = new Map();
  }

  async acquire(id) {
    while (this.locks.get(id)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    this.locks.set(id, true);
    console.log(`[Locker] Acquired lock for ${id}`);
    return true;
  }

  release(id) {
    this.locks.delete(id);
    console.log(`[Locker] Released lock for ${id}`);
  }
}

module.exports = new Locker();
