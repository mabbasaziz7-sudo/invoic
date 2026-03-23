export interface Product {
  id: number;
  name: string;
  barcode: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  category: string;
  expiryDate: string | null;
  minStock: number;
  image?: string;
  discountPrice?: number;
  discountPercent?: number;
  bulkQuantity?: number;
  bulkPrice?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  debt: number;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  productId?: number;
  barcode?: string;
}

export type PaymentMethod = 'cash' | 'visa' | 'mixed';

export interface Invoice {
  id: string;
  date: string;
  client: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  cashier: string;
  profit: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  visaAmount?: number;
}

export interface ReturnItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  reason: string;
}

export interface ReturnRecord {
  id: string;
  invoiceId: string;
  date: string;
  items: ReturnItem[];
  total: number;
  type: 'return' | 'exchange';
  exchangeItems?: InvoiceItem[];
  refundAmount: number;
  client: string;
  cashier: string;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface UserPermissions {
  pos: boolean;
  products: boolean;
  addProduct: boolean;
  editProduct: boolean;
  deleteProduct: boolean;
  users: boolean;
  inventory: boolean;
  statistics: boolean;
  debts: boolean;
  invoices: boolean;
  returns: boolean;
  settings: boolean;
  viewBuyPrice: boolean;
  viewProfit: boolean;
  giveDiscount: boolean;
  editPrices: boolean;
  customerDisplay: boolean;
}

export interface User {
  id: number;
  username: string;
  password: string;
  role: string;
  fullName?: string;
  phone?: string;
  active?: boolean;
  permissions?: UserPermissions;
  lastLogin?: string;
  avatar?: string;
}

export const defaultPermissions: Record<string, UserPermissions> = {
  'مدير': {
    pos: true, products: true, addProduct: true, editProduct: true, deleteProduct: true,
    users: true, inventory: true, statistics: true, debts: true, invoices: true,
    returns: true, settings: true, viewBuyPrice: true, viewProfit: true,
    giveDiscount: true, editPrices: true, customerDisplay: true,
  },
  'كاشير': {
    pos: true, products: false, addProduct: false, editProduct: false, deleteProduct: false,
    users: false, inventory: false, statistics: false, debts: false, invoices: true,
    returns: false, settings: false, viewBuyPrice: false, viewProfit: false,
    giveDiscount: false, editPrices: false, customerDisplay: true,
  },
  'مشرف': {
    pos: true, products: true, addProduct: true, editProduct: true, deleteProduct: false,
    users: false, inventory: true, statistics: true, debts: true, invoices: true,
    returns: true, settings: false, viewBuyPrice: true, viewProfit: true,
    giveDiscount: true, editPrices: false, customerDisplay: true,
  },
};

export interface DamagedItem {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  reason: string;
  date: string;
  returnId?: string;
}

export interface Coupon {
  id?: number;
  code: string;
  discountPercent: number;
  discountAmount: number;
  minOrderValue: number;
  expiryDate: string | null;
  active: boolean;
}

export type PageType = 'pos' | 'products' | 'users' | 'inventory' | 'statistics' | 'debts' | 'invoices' | 'settings' | 'returns' | 'customer-display' | 'active-promotions';
