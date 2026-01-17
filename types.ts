
export interface Product {
  id: string;
  name: string;
  unit: string; // e.g., kg, bunch, box, piece
  basePrice: number;
  category: 'Vegetables' | 'Fruits' | 'Grains' | 'Dairy' | 'Other' | 'General' | 'Service';
  imageUrl?: string;
  isGeneratingImage?: boolean;
  currentStock: number;
  minStockLevel: number;
  discountPercentage?: number;
  taxPercentage?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: number;
}

export type CurrencyCode = 'USD' | 'NPR' | 'INR' | 'PKR' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'BRL' | 'ZAR' | 'AED' | 'SAR' | 'KES' | 'NGN' | 'CUSTOM';
export type DateSystem = 'AD' | 'BS';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

export interface Sale {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  date: number;
  paymentStatus: 'Paid' | 'Pending';
  notes?: string;
}

export interface ActivityLog {
  id: string;
  action: 'Created' | 'Updated' | 'Deleted';
  timestamp: number;
  details: string;
  entityName: string; // Product name for context
  customerName: string; // Customer name for context
  amount: number;
  metadata?: any; // Stores snapshot of deleted data for recovery
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: number;
  category: string;
}

export interface Liability {
  id: string;
  source: string;
  amount: number;
  interestRate: number;
  date: number; // Logged date
  dueDate: number;
  status: 'Active' | 'Settled';
}

export interface FarmStats {
  totalRevenue: number;
  totalSalesCount: number;
  todayRevenue: number;
  topCustomer: string | null;
  totalExpenditure: number;
  totalLiabilities: number;
  bcRatio: number;
  netProfit: number;
}
