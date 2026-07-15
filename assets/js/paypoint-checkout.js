/* ============================================================
   Shared PayPoint checkout redirect.
   Used by onlineapplication.html, renewal.html, molohiya.html,
   and tsonlineapplication.html once their submit endpoint returns a
   `creditCard` object (see api/*-submit.js + lib/paypoint.js).
   ============================================================ */
(function () {
  'use strict';

  window.EIMZA_PAYPOINT = window.EIMZA_PAYPOINT || {};

  // Builds and auto-submits a hidden form to PayPoint's hosted gateway page
  // (spec III.2 — no signature required for this step, only the REST calls
  // our backend makes are signed).
  window.EIMZA_PAYPOINT.redirectToCheckout = function (checkout) {
    if (!checkout || !checkout.gatewayUrl || !checkout.trnKey) {
      throw new Error('Geçersiz ödeme bilgisi.');
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkout.gatewayUrl;
    form.style.display = 'none';

    const fields = {
      MerchantCode: checkout.merchantCode,
      MerchantUser: checkout.merchantUser,
      MerchantTrnId: checkout.merchantTrnId,
      TrnKey: checkout.trnKey,
      Amount: checkout.amount,
      Currency: checkout.currency,
      Description: checkout.description,
      Lang: checkout.lang
    };

    Object.keys(fields).forEach(function (key) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = fields[key] == null ? '' : String(fields[key]);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };
})();
