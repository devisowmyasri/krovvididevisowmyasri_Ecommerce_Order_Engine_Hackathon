class FailureInjector {
  constructor() {
    this.failCount = 0;
    this.failThreshold = 0.2; // 20% default failure rate
  }

  setThreshold(val) {
    this.failThreshold = val;
  }

  shouldFail(moduleName) {
    const r = Math.random();
    if (r < this.failThreshold) {
      console.warn(`[FailureInjector] Injecting failure into ${moduleName}!`);
      return true;
    }
    return false;
  }
}

module.exports = new FailureInjector();
