const getSendEmail = async () => (await import('./sendEmail.mjs')).sendEmail;

const formatIndianDateTime = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date).replace(' am', ' AM').replace(' pm', ' PM');
};

const formatPickupTime = (time) => {
  if (!/^\d{2}:\d{2}$/.test(String(time || ''))) return 'Not available';
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const sendClaimConfirmationEmail = async ({ consumer, merchant, listing, claim }) => {
  if (!process.env.RESEND_API_KEY || !consumer?.email) {
    console.warn('Claim confirmation email was skipped: email configuration or consumer email is missing.');
    return { sent: false };
  }

  const quantity = Number(claim.quantity);
  const pricePerItem = Number(listing.discountedPrice);
  const totalAmount = quantity * pricePerItem;
  const pickupTime = `${formatPickupTime(listing.pickupStart)} – ${formatPickupTime(listing.pickupEnd)}`;
  const tokenExpiry = formatIndianDateTime(claim.tokenExpiresAt);

  const sendEmail = await getSendEmail();
  const info = await sendEmail(
    consumer.email,
    'Food Claimed Successfully – Pickup Details | Stock2Serve',
    `<p>Hello ${escapeHtml(consumer.fullName || 'Customer')},</p>
<p>Your food reservation has been successfully confirmed. Please find your pickup details below.</p>
<h2>🍽️ Reservation Details</h2>
<table style="border-collapse:collapse">
  <tr><td><strong>Merchant:</strong></td><td>${escapeHtml(merchant?.shopName || 'Stock2Serve merchant')}</td></tr>
  <tr><td><strong>Shop Address:</strong></td><td>${escapeHtml([merchant?.shopAddress, merchant?.city].filter(Boolean).join(', ') || 'Not available')}</td></tr>
  <tr><td><strong>Food Item:</strong></td><td>${escapeHtml(listing.foodName)}</td></tr>
  <tr><td><strong>Quantity:</strong></td><td>${quantity}</td></tr>
  <tr><td><strong>Price per Item:</strong></td><td>₹${pricePerItem}</td></tr>
  <tr><td><strong>Total Amount:</strong></td><td>₹${totalAmount}</td></tr>
  <tr><td><strong>Pickup Token:</strong></td><td><strong>${escapeHtml(claim.pickupToken)}</strong></td></tr>
  <tr><td><strong>Pickup Time:</strong></td><td>${pickupTime}</td></tr>
  <tr><td><strong>Pickup Token Expires At:</strong></td><td>${tokenExpiry} IST</td></tr>
</table>
<h2>⚠️ Important Instructions</h2>
<ul><li>Present your pickup token to the merchant during pickup.</li><li>The pickup token is valid only until the expiry time mentioned above.</li><li>Please collect your food within the pickup window.</li><li>If the token expires before pickup, your reservation will be automatically cancelled and the food may be made available to other consumers.</li><li>Kindly carry the exact payment amount, if payment is to be made at pickup.</li></ul>
<p>Thank you for choosing Stock2Serve and helping reduce food waste.</p>
<p>Best Regards,<br><strong>Stock2Serve Team</strong><br>Save Food. Save More.</p>`,
  );

  return { sent: true, messageId: info.id };
};

const sendPasswordResetOtp = async ({ email, fullName, otp }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Email configuration is missing. Set RESEND_API_KEY before sending password reset emails.');
  }

  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';
  const sendEmail = await getSendEmail();
  const info = await sendEmail(
    email,
    'Stock2Serve Password Reset OTP',
    `<p>${escapeHtml(greeting)}</p>
<p>We received a request to reset your Stock2Serve account password.</p>
<p>Your One-Time Password (OTP) is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${escapeHtml(otp)}</p>
<p>This OTP is valid for 10 minutes.</p>
<p>If you did not request this password reset, please ignore this email.</p>
<p><strong>Do not share this OTP with anyone.</strong></p>
<p>Regards,<br>Stock2Serve Team</p>`,
  );

  return { sent: true, messageId: info.id };
};

module.exports = { sendClaimConfirmationEmail, sendPasswordResetOtp };
