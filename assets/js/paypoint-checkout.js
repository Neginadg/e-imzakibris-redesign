/* ============================================================
   Shared PayPoint checkout redirect.
   Used by onlineapplication.html, renewal.html, molohiya.html,
   and tsonlineapplication.html once their submit endpoint returns a
   `creditCard` object (see api/*-submit.js + lib/paypoint.js).
   ============================================================ */
(function () {
  'use strict';

  window.EIMZA_PAYPOINT = window.EIMZA_PAYPOINT || {};

  // Builds and auto-submits a hidden form to PayPoint's hosted gateway page.
  // Field list/order verified 2026-07 against a real example checkout form
  // (psp_cy.html) sent directly by PayPoint's IT team — default form
  // encoding (no enctype override), MerchantTrnId (not MerchantTrn), plus
  // MerchantUserToken/MerchantUserKey which their example always includes
  // even for a plain guest checkout (sent empty/nil below). No signature
  // required for this step — only the REST calls our backend makes are signed.
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
      MerchantTrnId: checkout.merchantTrnId,
      MerchantUser: checkout.merchantUser,
      TrnKey: checkout.trnKey,
      Amount: checkout.amount,
      Currency: checkout.currency,
      Lang: checkout.lang,
      Description: checkout.description,
      MerchantUserToken: '',
      MerchantUserKey: '00000000-0000-0000-0000-000000000000'
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
