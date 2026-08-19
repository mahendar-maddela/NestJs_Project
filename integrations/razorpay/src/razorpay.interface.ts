export interface RazorpayOrderOptions {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}
