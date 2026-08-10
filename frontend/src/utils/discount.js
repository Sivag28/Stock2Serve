export const getDiscountPercentage = (originalPrice, discountedPrice) => {
  const original = Number(originalPrice);
  const discounted = Number(discountedPrice);
  if (!original || original <= 0 || !discounted || discounted >= original) return null;
  const percentage = Math.round(((original - discounted) / original) * 100);
  return percentage > 0 ? `${percentage}%` : null;
};
