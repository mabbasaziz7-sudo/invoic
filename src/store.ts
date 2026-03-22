import { createClient } from '@supabase/supabase-js';
import { Product, Client, Invoice, Expense, User, ReturnRecord, UserPermissions, defaultPermissions } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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

// --- Sync Functions (Sync local storage for fast initial load) ---
export function getLocalUser(): User | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (data) return JSON.parse(data);
  return null;
}

// --- Async Supabase Functions ---

// Products
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) {
    console.error('Error fetching products:', error);
    const local = localStorage.getItem(PRODUCTS_KEY);
    return local ? JSON.parse(local) : [];
  }
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data));
  return data || [];
}

export async function saveProduct(product: Partial<Product>) {
  if (product.id) {
    const { data, error } = await supabase.from('products').update(product).eq('id', product.id).select();
    return { data: data?.[0], error };
  } else {
    // New product: exclude ID for auto-increment if handled by Supabase
    const { id, ...newProduct } = product as any;
    const { data, error } = await supabase.from('products').insert([newProduct]).select();
    return { data: data?.[0], error };
  }
}

export async function deleteProducts(ids: number[]) {
  const { error } = await supabase.from('products').delete().in('id', ids);
  return { error };
}

// Clients
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Error fetching clients:', error);
    const local = localStorage.getItem(CLIENTS_KEY);
    return local ? JSON.parse(local) : [];
  }
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(data));
  return data || [];
}

export async function saveClient(client: Partial<Client>) {
  if (client.id) {
    const { data, error } = await supabase.from('clients').update(client).eq('id', client.id).select();
    return { data: data?.[0], error };
  } else {
    const { id, ...newClient } = client as any;
    const { data, error } = await supabase.from('clients').insert([newClient]).select();
    return { data: data?.[0], error };
  }
}

// Invoices
export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase.from('invoices').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error fetching invoices:', error);
    const local = localStorage.getItem(INVOICES_KEY);
    return local ? JSON.parse(local) : [];
  }
  localStorage.setItem(INVOICES_KEY, JSON.stringify(data));
  return data || [];
}

export async function saveInvoice(invoice: Partial<Invoice>) {
  const { data, error } = await supabase.from('invoices').insert([invoice]).select();
  return { data: data?.[0], error };
}

// Expenses
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function saveExpense(expense: Partial<Expense>) {
  const { data, error } = await supabase.from('expenses').insert([expense]).select();
  return { data: data?.[0], error };
}

// Users
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
     const local = localStorage.getItem(USERS_KEY);
     return local ? JSON.parse(local) : [];
  }
  return data || [];
}

export async function saveUser(user: Partial<User>) {
  if (user.id) {
    const { data, error } = await supabase.from('users').update(user).eq('id', user.id).select();
    return { data: data?.[0], error };
  } else {
    const { id, ...newUser } = user as any;
    const { data, error } = await supabase.from('users').insert([newUser]).select();
    return { data: data?.[0], error };
  }
}

// Settings
export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').limit(1).single();
  if (error) {
    const local = localStorage.getItem(SETTINGS_KEY);
    return local ? JSON.parse(local) : {};
  }
  return data || {};
}

export async function saveSettings(settings: Record<string, any>) {
  // Assume one row in settings table
  const { error } = await supabase.from('settings').upsert([{ id: 1, ...settings }]);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return { error };
}

// Plural aliases for compatibility
export const saveInvoices = async (invs: any[]) => { for(const i of invs) await saveInvoice(i); };
export const saveProducts = async (prods: any[]) => { for(const p of prods) await saveProduct(p); };
export const saveClients = async (clis: any[]) => { for(const c of clis) await saveClient(c); };
export const saveExpenses = async (exps: any[]) => { for(const e of exps) await saveExpense(e); };

// Returns
export async function getReturns() {
  const { data, error } = await supabase.from('returns').select('*').order('date', { ascending: false });
  return data || [];
}
export async function saveReturns(rets: any[]) { 
  for(const r of rets) await supabase.from('returns').upsert([r]);
}

// Auth functions
export async function loginUser(username: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('active', true)
    .single();

  if (error || !data) return null;
  
  const user = data as User;
  const updatedUser = { ...user, lastLogin: new Date().toISOString() };
  await supabase.from('users').update({ lastLogin: updatedUser.lastLogin }).eq('id', user.id);
  
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
  return updatedUser;
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

// Cart Display (for secondary screen)
export function saveCartDisplay(displayData: any) {
  localStorage.setItem(CART_DISPLAY_KEY, JSON.stringify(displayData));
}

export function getCartDisplay() {
  const data = localStorage.getItem(CART_DISPLAY_KEY);
  return data ? JSON.parse(data) : { items: [], total: 0 };
}
