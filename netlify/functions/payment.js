'use strict';

// createDepositStep returns all data the frontend needs to render a UPI payment.
// Replace the body of this function to swap in Razorpay (or any other provider)
// without touching brief.js or the HTML.
function createDepositStep(briefId, amount) {
  const vpa       = process.env.UPI_VPA;
  const payeeName = process.env.UPI_PAYEE_NAME || 'Pixlane Digital';

  if (!vpa) throw new Error('Missing env var: UPI_VPA');

  const note    = 'Brief-' + briefId;
  const upiLink = 'upi://pay'
    + '?pa=' + encodeURIComponent(vpa)
    + '&pn=' + encodeURIComponent(payeeName)
    + '&am=' + amount
    + '&tn=' + encodeURIComponent(note);

  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='
    + encodeURIComponent(upiLink);

  return { briefId, amount, upiLink, qrUrl };
}

module.exports = { createDepositStep };
