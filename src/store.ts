import { Product, Client, Invoice, Expense, User, ReturnRecord, UserPermissions, defaultPermissions, DamagedItem, Coupon } from './types';
import { supabase } from './lib/supabase';

// --- مساعدات (Helpers) ---
// (No global helpers currently needed)

// 1. المنتجات (Products)
const mapProductToDB = (p: Partial<Product>) => ({
  name: p.name,
  barcode: p.barcode,
  quantity: p.quantity,
  buy_price: p.buyPrice,
  sell_price: p.sellPrice,
  category: p.category,
  expiry_date: p.expiryDate || null,
  min_stock: p.minStock,
  image: p.image,
});

const mapDBToProduct = (d: any): Product => ({
  id: d.id,
  name: d.name,
  barcode: d.barcode || '',
  quantity: d.quantity || 0,
  buyPrice: Number(d.buy_price) || 0,
  sellPrice: Number(d.sell_price) || 0,
  category: d.category || 'عام',
  expiryDate: d.expiry_date || '',
  minStock: d.min_stock || 0,
  image: d.image || '',
});

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id');
  if (error) return [];
  return (data || []).map(mapDBToProduct);
}

export async function saveProduct(product: Partial<Product>) {
  const dbData = mapProductToDB(product);
  if (product.id) {
    const { error } = await supabase.from('products').update(dbData).eq('id', product.id);
    if (error) console.error('Error updating product stock:', error, 'ID:', product.id);
  } else {
    const { error } = await supabase.from('products').insert(dbData);
    if (error) console.error('Error inserting product:', error);
  }
}

export async function deleteProduct(id: number) {
  await supabase.from('products').delete().eq('id', id);
}

// 2. العملاء (Clients)
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) return [];
  return data as Client[];
}

export async function saveClient(client: Partial<Client>) {
  if (client.id) {
    await supabase.from('clients').update(client).eq('id', client.id);
  } else {
    await supabase.from('clients').insert(client);
  }
}

export async function deleteClient(id: number) {
  await supabase.from('clients').delete().eq('id', id);
}

// 3. الفواتير (Invoices)
const mapInvoiceToDB = (inv: Partial<Invoice>) => ({
  id: inv.id,
  date: inv.date,
  client: inv.client,
  items: inv.items,
  subtotal: inv.subtotal,
  discount: inv.discount,
  tax: inv.tax,
  total: inv.total,
  paid: inv.paid,
  remaining: inv.remaining,
  cashier: inv.cashier,
  profit: inv.profit,
  payment_method: inv.paymentMethod,
  cash_amount: inv.cashAmount,
  visa_amount: inv.visaAmount,
});

const mapDBToInvoice = (d: any): Invoice => ({
  id: d.id,
  date: d.date,
  client: d.client,
  items: d.items,
  subtotal: Number(d.subtotal),
  discount: Number(d.discount),
  tax: Number(d.tax),
  total: Number(d.total),
  paid: Number(d.paid),
  remaining: Number(d.remaining),
  cashier: d.cashier,
  profit: Number(d.profit),
  paymentMethod: d.payment_method,
  cashAmount: Number(d.cash_amount),
  visaAmount: Number(d.visa_amount),
});

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(mapDBToInvoice);
}

export async function saveInvoice(inv: Invoice) {
  const { error } = await supabase.from('invoices').upsert(mapInvoiceToDB(inv));
  if (error) console.error('Error saving invoice:', error);
}

export async function deleteInvoiceFromDB(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) console.error('Error deleting invoice:', error);
}

// 4. المصاريف (Expenses)
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return [];
  return data as Expense[];
}

export async function saveExpense(expense: Expense) {
  await supabase.from('expenses').insert(expense);
}

// 5. المرتجعات (Returns)
const mapReturnToDB = (ret: Partial<ReturnRecord>) => ({
  id: ret.id,
  invoice_id: ret.invoiceId,
  date: ret.date,
  items: ret.items,
  total: ret.total,
  type: ret.type,
  exchange_items: ret.exchangeItems,
  refund_amount: ret.refundAmount,
  client: ret.client,
  cashier: ret.cashier,
});

const mapDBToReturn = (d: any): ReturnRecord => ({
  id: d.id,
  invoiceId: d.invoice_id,
  date: d.date,
  items: d.items,
  total: Number(d.total),
  type: d.type,
  exchangeItems: d.exchange_items,
  refundAmount: Number(d.refund_amount),
  client: d.client,
  cashier: d.cashier,
});

export async function getReturns(): Promise<ReturnRecord[]> {
  const { data, error } = await supabase.from('returns').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(mapDBToReturn);
}

export async function saveReturn(record: ReturnRecord) {
  await supabase.from('returns').insert(mapReturnToDB(record));
}

// 6. الإعدادات (Settings) - سنستخدم localStorage كخيار احتياطي ومزامنتها مع Supabase
export function getSettings() {
  const data = localStorage.getItem('bakhcha_settings');
  if (data) return JSON.parse(data);
  return {
    storeName: 'Bakhcha Pro Supermarket',
    phone: '55-55-55-0555',
    address: 'حي المعارض الشريعة',
    defaultTax: 17,
    currency: 'دج',
    logo: '',
    showLogoOnInvoice: true,
    showQROnInvoice: true,
    showBarcodeOnInvoice: true,
    invoiceSize: 'receipt',
  };
}

export function saveSettings(settings: any) {
  localStorage.setItem('bakhcha_settings', JSON.stringify(settings));
}

// 7. المستخدمون (Users)
const mapUserToDB = (u: Partial<User>) => ({
  username: u.username,
  password: u.password,
  role: u.role,
  full_name: u.fullName,
  phone: u.phone,
  active: u.active,
  permissions: u.permissions,
  last_login: u.lastLogin || null,
});

const mapDBToUser = (d: any): User => ({
  id: d.id,
  username: d.username,
  password: d.password,
  role: d.role,
  fullName: d.full_name,
  phone: d.phone,
  active: d.active,
  permissions: d.permissions,
  lastLogin: d.last_login,
});

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').order('id');
  if (error) return [];
  return (data || []).map(mapDBToUser);
}

export async function saveUser(user: Partial<User>) {
  const dbData = mapUserToDB(user);
  if (user.id) {
    await supabase.from('users').update(dbData).eq('id', user.id);
  } else {
    await supabase.from('users').insert(dbData);
  }
}

export async function deleteUserFromDB(id: number) {
  await supabase.from('users').delete().eq('id', id);
}

// 8. الأصناف (Categories)
export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('categories').select('name').order('name');
  if (error) {
    const saved = localStorage.getItem('bakhcha_categories');
    return saved ? JSON.parse(saved) : ['الكل', 'عام'];
  }
  const cats = data.map(d => d.name);
  return ['الكل', ...cats];
}

export async function saveCategories(categories: string[]) {
  localStorage.setItem('bakhcha_categories', JSON.stringify(categories));
  // Optional: Also sync to Supabase categories table
  const catsToInsert = categories.filter(c => c !== 'الكل').map(c => ({ name: c }));
  await supabase.from('categories').delete().not('name', 'eq', 'placeholder'); // Clear old
  await supabase.from('categories').insert(catsToInsert);
}

// 9. Auth functions (سنعتمد على Supabase Auth أو جدول المستخدمين البسيط)
export async function loginUser(username: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
    
  if (error || !data) return null;
  const user = mapDBToUser(data);
  localStorage.setItem('bakhcha_current_user', JSON.stringify(user));
  return user;
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem('bakhcha_current_user');
  if (data) return JSON.parse(data);
  return null;
}

export function logoutUser() {
  localStorage.removeItem('bakhcha_current_user');
}

export function getUserPermissions(user: User): UserPermissions {
  const roleDefaults = defaultPermissions[user.role as keyof typeof defaultPermissions] || defaultPermissions['كاشير'];
  if (!user.permissions) return roleDefaults;
  // Merge stored perms with defaults to handle new keys (like statistics)
  return { ...roleDefaults, ...user.permissions };
}


// Cart display (للشاشة الثانية)
export function saveCartDisplay(displayData: any) {
  localStorage.setItem('bakhcha_cart_display', JSON.stringify(displayData));
}

export function getCartDisplay() {
  const data = localStorage.getItem('bakhcha_cart_display');
  if (data) return JSON.parse(data);
  return { items: [], total: 0, storeName: 'Bakhcha Pro' };
}
// 10. المنتجات التالفة (Damaged Items)
const mapDamagedToDB = (d: DamagedItem) => ({
  product_id: d.productId,
  product_name: d.productName,
  quantity: d.quantity,
  reason: d.reason,
  date: d.date,
  return_id: d.returnId
});

export async function getDamagedItems(): Promise<DamagedItem[]> {
  const { data, error } = await supabase.from('damaged_items').select('*').order('date', { ascending: false });
  if (error) return [];
  return data.map(d => ({
    id: d.id,
    productId: d.product_id,
    productName: d.product_name,
    quantity: d.quantity,
    reason: d.reason,
    date: d.date,
    returnId: d.return_id
  }));
}

export async function saveDamagedItem(item: DamagedItem) {
  await supabase.from('damaged_items').insert(mapDamagedToDB(item));
}

// 11. الكوبونات والعروض (Coupons)
const mapCouponToDB = (c: Partial<Coupon>) => ({
  code: c.code,
  discount_percent: c.discountPercent,
  discount_amount: c.discountAmount,
  min_order_value: c.minOrderValue,
  expiry_date: c.expiryDate || null,
  active: c.active
});

export async function getCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data.map(d => ({
    id: d.id,
    code: d.code,
    discountPercent: Number(d.discount_percent),
    discountAmount: Number(d.discount_amount),
    minOrderValue: Number(d.min_order_value),
    expiryDate: d.expiry_date || '',
    active: d.active
  }));
}

export async function saveCoupon(coupon: Partial<Coupon>) {
  if (coupon.id) {
    await supabase.from('coupons').update(mapCouponToDB(coupon)).eq('id', coupon.id);
  } else {
    await supabase.from('coupons').insert(mapCouponToDB(coupon));
  }
}

export async function deleteCouponFromDB(id: number) {
  await supabase.from('coupons').delete().eq('id', id);
}
