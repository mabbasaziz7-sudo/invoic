import { Product, Client, Invoice, Expense, User, ReturnRecord, UserPermissions, defaultPermissions } from './types';
import { supabase } from './lib/supabase';

// --- مساعدات (Helpers) ---
// (No global helpers currently needed)

// 1. المنتجات (Products)
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true });
  if (error) { console.error('Error fetching products:', error); return []; }
  return data as Product[];
}

export async function saveProduct(product: Partial<Product>) {
  if (product.id) {
    const { error } = await supabase.from('products').update(product).eq('id', product.id);
    if (error) console.error('Error updating product:', error);
  } else {
    const { error } = await supabase.from('products').insert(product);
    if (error) console.error('Error inserting product:', error);
  }
}

export async function deleteProduct(id: number) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) console.error('Error deleting product:', error);
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
export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as Invoice[];
}

export async function saveInvoice(invoice: Invoice) {
  const { error } = await supabase.from('invoices').insert(invoice);
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
export async function getReturns(): Promise<ReturnRecord[]> {
  const { data, error } = await supabase.from('returns').select('*').order('date', { ascending: false });
  if (error) return [];
  return data as ReturnRecord[];
}

export async function saveReturn(record: ReturnRecord) {
  await supabase.from('returns').insert(record);
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
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*').order('id');
  if (error) return [];
  return data as User[];
}

export async function saveUser(user: Partial<User>) {
  if (user.id) {
    await supabase.from('users').update(user).eq('id', user.id);
  } else {
    await supabase.from('users').insert(user);
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
  const user = data as User;
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
  if (user.permissions) return user.permissions;
  return defaultPermissions[user.role as keyof typeof defaultPermissions] || defaultPermissions['كاشير'];
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
