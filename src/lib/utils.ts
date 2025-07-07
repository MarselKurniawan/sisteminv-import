/**
 * Utility functions for the application
 */

/**
 * Format a number as currency in IDR
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Custom rounding function for product prices
 * - Numbers ending in 500 stay as is (e.g., 25,500 remains 25,500)
 * - Numbers between x,001 and x,499 round up to x,500 (e.g., 25,400 becomes 25,500)
 * - Numbers between x,501 and x,999 round up to (x+1),000 (e.g., 25,700 becomes 26,000)
 * 
 * @param amount The amount to round
 * @returns Rounded amount
 */
export const customRound = (amount: number): number => {
  // Get the last three digits
  const lastThreeDigits = amount % 1000;
  
  // If it's already a round thousand or exactly 500, no rounding needed
  if (lastThreeDigits === 0 || lastThreeDigits === 500) {
    return amount;
  }
  
  // If it's between 1-499, round up to 500
  if (lastThreeDigits < 500) {
    return Math.floor(amount / 1000) * 1000 + 500;
  }
  
  // If it's between 501-999, round up to the next thousand
  return Math.ceil(amount / 1000) * 1000;
};