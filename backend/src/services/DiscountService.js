class DiscountService {
  constructor() {
    this.coupons = {
      'SAVE10': { type: 'percentage', value: 10 },
      'FLAT200': { type: 'fixed', value: 200 }
    };
  }

  calculateDiscount(userId, cartItems, totalBeforeDiscount, couponCode = null) {
    let discountAmount = 0;

    // 1. Quantity > 3 (extra 5% on those products)
    cartItems.forEach(item => {
      if (item.quantity > 3) {
        // We'll apply it to the product's total
        const productDiscount = (item.price * item.quantity) * 0.05;
        discountAmount += productDiscount;
        console.log(`[Discount] Quantity discount applied for ${item.productId}: ₹${productDiscount}`);
      }
    });

    // 2. Total > ₹1000 (10% discount)
    if (totalBeforeDiscount > 1000) {
      const totalDiscount = totalBeforeDiscount * 0.10;
      discountAmount += totalDiscount;
      console.log(`[Discount] Total > 1000 discount applied: ₹${totalDiscount}`);
    }

    // 3. Coupon Code
    if (couponCode && this.coupons[couponCode]) {
      const coupon = this.coupons[couponCode];
      if (coupon.type === 'percentage') {
        discountAmount += (totalBeforeDiscount * (coupon.value / 100));
      } else if (coupon.type === 'fixed') {
        discountAmount += coupon.value;
      }
      console.log(`[Discount] Coupon ${couponCode} applied: ₹${discountAmount}`);
    }

    return Math.min(discountAmount, totalBeforeDiscount); // Cannot discount more than total
  }

  validateCoupon(code) {
    return !!this.coupons[code];
  }
}

module.exports = new DiscountService();
