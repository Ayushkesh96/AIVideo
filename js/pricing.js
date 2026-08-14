/**
 * HIGGSFIELD AI — PRICING & FAQ LOGIC
 * Dynamic 30% Off Annual Billing Calculations & Accordion Controls
 */

(function () {
  const billingMonthlyBtn = document.getElementById('billing-monthly-btn');
  const billingAnnualBtn = document.getElementById('billing-annual-btn');
  const planAmounts = document.querySelectorAll('.pricing-amount');
  const planPeriods = document.querySelectorAll('.pricing-period');

  const prices = {
    starter: { monthly: 0, annual: 0 },
    creator: { monthly: 19, annual: 13 }, // 30% off
    pro: { monthly: 49, annual: 34 },     // 30% off
    studio: { monthly: 99, annual: 69 }   // 30% off
  };

  let isAnnual = true; // Default 30% OFF annual view

  function updatePrices() {
    planAmounts.forEach(el => {
      const plan = el.dataset.plan;
      if (prices[plan]) {
        el.textContent = isAnnual ? prices[plan].annual : prices[plan].monthly;
      }
    });

    planPeriods.forEach(el => {
      el.textContent = isAnnual ? '/month, billed annually' : '/month';
    });
  }

  if (billingMonthlyBtn && billingAnnualBtn) {
    billingMonthlyBtn.addEventListener('click', () => {
      isAnnual = false;
      billingMonthlyBtn.classList.add('active');
      billingAnnualBtn.classList.remove('active');
      updatePrices();
    });

    billingAnnualBtn.addEventListener('click', () => {
      isAnnual = true;
      billingAnnualBtn.classList.add('active');
      billingMonthlyBtn.classList.remove('active');
      updatePrices();
    });
  }

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Close others
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    updatePrices();
  });
})();
