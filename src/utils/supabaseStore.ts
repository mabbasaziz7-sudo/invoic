import { supabase } from './supabase';
import { Product, Client, Invoice, Expense, User } from '../types';

/**
 * Examples of CRUD operations using Supabase.
 * These functions can replace the localStorage logic in src/store.ts
 */

// --- Products ---
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data as Product[];
}

export async function addProduct(product: Omit<Product, 'id'>) {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select();

  if (error) {
    console.error('Error adding product:', error);
    return null;
  }
  return data?.[0] as Product;
}

export async function updateProduct(id: number, updates: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating product:', error);
    return null;
  }
  return data?.[0] as Product;
}

// --- Clients ---
export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*');
  
  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
  return data as Client[];
}

// --- Invoices ---
export async function addInvoice(invoice: Omit<Invoice, 'id'>) {
  const { data, error } = await supabase
    .from('invoices')
    .insert([invoice])
    .select();

  if (error) {
    console.error('Error adding invoice:', error);
    return null;
  }
  return data?.[0] as Invoice;
}

/**
 * Authentication with Supabase
 * You can use Supabase Auth for more security
 */
export async function supabaseLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login error:', error.message);
    return null;
  }
  return data.user;
}
