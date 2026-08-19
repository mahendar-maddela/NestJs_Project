/**
 * Converts amount to energy (kWh) or energy to amount.
 * Preserves the exact same logic as legacy AmountToEnergyConvertion.js
 */
export function amountToEnergyConversion(
  amount: number,
  gst: number,
  pricePerKw: number,
  isAmountToKw = true,
): number {
  const gstMultiplier = 1 + gst / 100;

  if (isAmountToKw) {
    // Convert amount → kWh
    return parseFloat((parseFloat(String(amount)) / gstMultiplier / pricePerKw).toFixed(3));
  } else {
    // Convert kWh → amount
    return parseFloat((parseFloat(String(amount)) * pricePerKw * gstMultiplier).toFixed(3));
  }
}
