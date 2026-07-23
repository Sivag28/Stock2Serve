const nodemailer = require('nodemailer');

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
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !consumer?.email) {
    console.warn('Claim confirmation email was skipped: email configuration or consumer email is missing.');
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  const quantity = Number(claim.quantity);
  const pricePerItem = Number(listing.discountedPrice);
  const totalAmount = quantity * pricePerItem;
  const pickupTime = `${formatPickupTime(listing.pickupStart)} – ${formatPickupTime(listing.pickupEnd)}`;
  const tokenExpiry = formatIndianDateTime(claim.tokenExpiresAt);

  const info = await transporter.sendMail({
    from: `"Stock2Serve" <${process.env.EMAIL_USER}>`,
    to: consumer.email,
    subject: 'Food Claimed Successfully – Pickup Details | Stock2Serve',
    text: `Hello ${consumer.fullName || 'Customer'},

Your food reservation has been successfully confirmed. Please find your pickup details below.

Reservation Details
Merchant: ${merchant?.shopName || 'Stock2Serve merchant'}
Food Item: ${listing.foodName}
Quantity: ${quantity}
Price per Item: ₹${pricePerItem}
Total Amount: ₹${totalAmount}
Pickup Token: ${claim.pickupToken}
Pickup Time: ${pickupTime}
Pickup Token Expires At: ${tokenExpiry} IST

Important Instructions
- Present your pickup token to the merchant during pickup.
- The pickup token is valid only until the expiry time mentioned above.
- Please collect your food within the pickup window.
- If the token expires before pickup, your reservation will be automatically cancelled and the food may be made available to other consumers.
- Kindly carry the exact payment amount, if payment is to be made at pickup.

Thank you for choosing Stock2Serve and helping reduce food waste.

Best Regards,
Stock2Serve Team
Save Food. Save More.`,
    html: `<p>Hello ${escapeHtml(consumer.fullName || 'Customer')},</p>
<p>Your food reservation has been successfully confirmed. Please find your pickup details below.</p>
<h2>🍽️ Reservation Details</h2>
<table style="border-collapse:collapse">
  <tr><td><strong>Merchant:</strong></td><td>${escapeHtml(merchant?.shopName || 'Stock2Serve merchant')}</td></tr>
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
  });
  return { sent: true, messageId: info.messageId };
};

module.exports = { sendClaimConfirmationEmail };
