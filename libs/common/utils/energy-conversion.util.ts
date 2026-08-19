/** Mirrors `controllers/ocpp/AmountToEnergyConvertion.js`. */
export function amountToEnergyConversion(amount: number, gst: number, pricePerKw: number, isAmountToKw = true): number {
  const gstMultiplier = 1 + gst / 100;

  if (isAmountToKw) {
    return parseFloat((parseFloat(String(amount)) / gstMultiplier / pricePerKw).toFixed(3));
  }
  return parseFloat((parseFloat(String(amount)) * pricePerKw * gstMultiplier).toFixed(3));
}
