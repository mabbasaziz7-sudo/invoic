import { Product, Client, Invoice, Expense, User, ReturnRecord, UserPermissions, defaultPermissions } from './types';

const PRODUCTS_KEY = 'bakhcha_products';
const CLIENTS_KEY = 'bakhcha_clients';
const INVOICES_KEY = 'bakhcha_invoices';
const EXPENSES_KEY = 'bakhcha_expenses';
const USERS_KEY = 'bakhcha_users';
const SETTINGS_KEY = 'bakhcha_settings';
const CATEGORIES_KEY = 'bakhcha_categories';
const RETURNS_KEY = 'bakhcha_returns';
const CART_DISPLAY_KEY = 'bakhcha_cart_display';
const CURRENT_USER_KEY = 'bakhcha_current_user';

const defaultProducts: Product[] = [
  { id: 1, name: 'منتج تجريبي مع ضريبة', barcode: '123456789', quantity: 31, buyPrice: 60, sellPrice: 100, category: 'عام', expiryDate: null, minStock: 5, image: '' },
  { id: 2, name: 'شوكولاطة', barcode: '5901234123457', quantity: 682, buyPrice: 450, sellPrice: 700, category: 'مواد غذائية', expiryDate: null, minStock: 10, image: '' },
  { id: 3, name: 'مربى', barcode: '4006381333931', quantity: 493, buyPrice: 75, sellPrice: 117, category: 'مواد غذائية', expiryDate: '2026-03-25', minStock: 5, image: '' },
  { id: 4, name: 'ماكسي', barcode: '8690504012009', quantity: 5988, buyPrice: 400, sellPrice: 617, category: 'حليب ومشتقاته', expiryDate: '2026-04-19', minStock: 10, image: '' },
  { id: 5, name: 'عطر فخم', barcode: '2958642392', quantity: 495, buyPrice: 1800, sellPrice: 2500, category: 'عام', expiryDate: null, minStock: 5, image: '' },
  { id: 6, name: 'sucre', barcode: '2955208208', quantity: 50, buyPrice: 180, sellPrice: 250, category: 'مواد غذائية', expiryDate: null, minStock: 5, image: '' },
  { id: 7, name: 'sucre', barcode: '2943991599', quantity: 47, buyPrice: 350, sellPrice: 520, category: 'مواد غذائية', expiryDate: null, minStock: 5, image: '' },
  { id: 8, name: 'sucre1', barcode: '2925564643', quantity: 6, buyPrice: 35, sellPrice: 55, category: 'مواد غذائية', expiryDate: null, minStock: 5, image: '' },
  { id: 9, name: 'tomate', barcode: '2937910599', quantity: 200, buyPrice: 170, sellPrice: 250, category: 'مواد غذائية', expiryDate: null, minStock: 5, image: '' },
  { id: 10, name: 'ff', barcode: '2994065328', quantity: 100, buyPrice: 170, sellPrice: 250, category: 'عام', expiryDate: null, minStock: 5, image: '' },
];

const defaultClients: Client[] = [
  { id: 1, name: 'عميل نقدي', phone: '', debt: 0 },
  { id: 2, name: 'أحمد محمد', phone: '0555-12-34-56', debt: 1500 },
  { id: 3, name: 'خالد علي', phone: '0666-78-90-12', debt: 3200 },
];

const defaultUsers: User[] = [
  { id: 1, username: 'admin', password: 'admin', role: 'مدير', fullName: 'المدير العام', phone: '0555000000', active: true, permissions: defaultPermissions['مدير'] },
  { id: 2, username: 'cashier1', password: '1234', role: 'كاشير', fullName: 'كاشير 1', phone: '0666000000', active: true, permissions: defaultPermissions['كاشير'] },
  { id: 3, username: 'supervisor', password: '1234', role: 'مشرف', fullName: 'المشرف', phone: '0777000000', active: true, permissions: defaultPermissions['مشرف'] },
];

const defaultCategories = ['الكل', 'حليب ومشتقاته', 'عام', 'مواد غذائية'];

const defaultSettings: Record<string, any> = {
  storeName: 'Bakhcha Pro Supermarket',
  phone: '55-55-55-0555',
  address: 'حي المعارض الشريعة',
  defaultTax: 17,
  currency: 'دج',
  logo: '',
  invoiceTitle: '',
  invoiceFooter: 'شكراً لزيارتكم - نتمنى لكم يوماً سعيداً 🙏',
  invoiceNotes: '',
  taxNumber: '',
  nif: '',
  showLogoOnInvoice: true,
  showQROnInvoice: true,
  showBarcodeOnInvoice: true,
  invoiceSize: 'receipt',
  customerWelcome: 'مرحباً بكم',
  customerAd: '',
  showLogoOnDisplay: true,
  displayTheme: 'dark',
};

export function getProducts(): Product[] {
  const data = localStorage.getItem(PRODUCTS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(defaultProducts));
  return defaultProducts;
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getClients(): Client[] {
  const data = localStorage.getItem(CLIENTS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(defaultClients));
  return defaultClients;
}

export function saveClients(clients: Client[]) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function getInvoices(): Invoice[] {
  const data = localStorage.getItem(INVOICES_KEY);
  if (data) return JSON.parse(data);
  return [];
}

export function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}

export function getExpenses(): Expense[] {
  const data = localStorage.getItem(EXPENSES_KEY);
  if (data) return JSON.parse(data);
  return [];
}

export function saveExpenses(expenses: Expense[]) {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function getUsers(): User[] {
  const data = localStorage.getItem(USERS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSettings() {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
  return defaultSettings;
}

export function saveSettings(settings: Record<string, any>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getCategories(): string[] {
  const data = localStorage.getItem(CATEGORIES_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
  return defaultCategories;
}

export function saveCategories(categories: string[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getReturns(): ReturnRecord[] {
  const data = localStorage.getItem(RETURNS_KEY);
  if (data) return JSON.parse(data);
  return [];
}

export function saveReturns(returns: ReturnRecord[]) {
  localStorage.setItem(RETURNS_KEY, JSON.stringify(returns));
}

export function getCartDisplay() {
  const data = localStorage.getItem(CART_DISPLAY_KEY);
  if (data) return JSON.parse(data);
  return { items: [], total: 0, storeName: defaultSettings.storeName };
}

export function saveCartDisplay(displayData: { items: { name: string; quantity: number; price: number; total: number }[]; total: number; storeName: string }) {
  localStorage.setItem(CART_DISPLAY_KEY, JSON.stringify(displayData));
}

// Auth functions
export function loginUser(username: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user && user.active !== false) {
    const updatedUser = { ...user, lastLogin: new Date().toISOString() };
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    saveUsers(updatedUsers);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  }
  return null;
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (data) return JSON.parse(data);
  return null;
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getUserPermissions(user: User): UserPermissions {
  if (user.permissions) return user.permissions;
  return defaultPermissions[user.role] || defaultPermissions['كاشير'];
}
