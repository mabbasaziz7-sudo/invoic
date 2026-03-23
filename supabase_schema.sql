-- 🚀 قم بنسخ هذا الكود إلى SQL Editor في Supabase للبدء:

-- 1. المنتجات (Products)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    quantity INTEGER DEFAULT 0,
    buy_price DECIMAL DEFAULT 0,
    sell_price DECIMAL DEFAULT 0,
    category TEXT DEFAULT 'عام',
    expiry_date DATE,
    min_stock INTEGER DEFAULT 5,
    image TEXT,
    discount_price DECIMAL DEFAULT 0,
    discount_percent DECIMAL DEFAULT 0,
    bulk_quantity INTEGER DEFAULT 0,
    bulk_price DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. العملاء (Clients)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    debt DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. الفواتير (Invoices)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, -- INV-2026...
    date DATE DEFAULT CURRENT_DATE,
    client TEXT,
    items JSONB NOT NULL,
    subtotal DECIMAL,
    discount DECIMAL DEFAULT 0,
    tax DECIMAL DEFAULT 17,
    total DECIMAL,
    paid DECIMAL,
    remaining DECIMAL,
    cashier TEXT,
    profit DECIMAL,
    payment_method TEXT DEFAULT 'cash', 
    cash_amount DECIMAL DEFAULT 0,
    visa_amount DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. المصاريف (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    date TIMESTAMPTZ DEFAULT NOW(),
    category TEXT,
    description TEXT,
    amount DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. المرتجعات (Returns)
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY, 
    invoice_id TEXT,
    date DATE DEFAULT CURRENT_DATE,
    items JSONB NOT NULL,
    total DECIMAL,
    type TEXT,
    exchange_items JSONB,
    refund_amount DECIMAL,
    client TEXT,
    cashier TEXT,
    shift_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. المستخدمين (Users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'كاشير',
    full_name TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT TRUE,
    permissions JSONB,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. التصنيفات (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📊 تفعيل RLS لجميع الجداول
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول (للتبسيط سنسمح للكل بالوصول)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access" ON products;
    CREATE POLICY "Public access" ON products FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access" ON clients;
    CREATE POLICY "Public access" ON clients FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access" ON invoices;
    CREATE POLICY "Public access" ON invoices FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access" ON expenses;
    CREATE POLICY "Public access" ON expenses FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access" ON returns;
    CREATE POLICY "Public access" ON returns FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access" ON users;
    CREATE POLICY "Public access" ON users FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Public access" ON categories;
    CREATE POLICY "Public access" ON categories FOR ALL USING (true) WITH CHECK (true);
END $$;

-- جدول المنتجات التالفة التي لا تُرد للمخزون
CREATE TABLE IF NOT EXISTS damaged_items (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    product_name TEXT,
    quantity INTEGER,
    reason TEXT,
    date DATE DEFAULT NOW(),
    return_id TEXT
);

-- جدول الكوبونات والعروض
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_percent DECIMAL DEFAULT 0,
    discount_amount DECIMAL DEFAULT 0,
    min_order_value DECIMAL DEFAULT 0,
    expiry_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تحديث جدول الكوبونات لإضافة اسم
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS name TEXT;

-- جدول عروض المجموعات (Promo Groups)
CREATE TABLE IF NOT EXISTS product_offers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    discount_percent DECIMAL DEFAULT 0,
    discount_amount DECIMAL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ربط المنتجات بالعروض (Many-to-Many)
CREATE TABLE IF NOT EXISTS product_offer_items (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER REFERENCES product_offers(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE
);

-- جدول تقفيل اليوم (Daily Closing / Z-Report)
CREATE TABLE IF NOT EXISTS daily_closings (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE DEFAULT NOW(),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    total_sales DECIMAL DEFAULT 0,
    cash_total DECIMAL DEFAULT 0,
    visa_total DECIMAL DEFAULT 0,
    expenses_total DECIMAL DEFAULT 0,
    net_profit DECIMAL DEFAULT 0,
    closed_by TEXT,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جداول الورديات (Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    cashier_id INTEGER REFERENCES users(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    initial_cash DECIMAL DEFAULT 0,
    actual_cash DECIMAL DEFAULT 0,
    expected_cash DECIMAL DEFAULT 0,
    total_sales DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'open', -- open, closed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تحديث جدول عروض المجموعات لإضافة تاريخ انتهاء
ALTER TABLE product_offers ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- تحديث جدول تقفيل اليوم
ALTER TABLE daily_closings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE daily_closings ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NOW();

-- سياسات الوصول
DO $$ BEGIN
    ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public access shifts" ON shifts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- إضافة مدير افتراضي (اختياري)
INSERT INTO users (username, password, role, full_name, active) 
VALUES ('admin', 'admin123', 'مدير', 'مدير النظام', TRUE)
ON CONFLICT (username) DO NOTHING;

-- إضافة تصنيف افتراضي
INSERT INTO categories (name) VALUES ('عام') ON CONFLICT (name) DO NOTHING;
INSERT INTO categories (name) VALUES ('الكل') ON CONFLICT (name) DO NOTHING;
