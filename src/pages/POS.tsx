import { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Invoice, Client, PaymentMethod, User } from '../types';
import { getProducts, getClients, saveClient, getUsers, saveInvoice, saveProduct, getSettings, getCategories, saveCartDisplay, getUserPermissions } from '../store';

interface POSProps {
  currentUser?: User | null;
}

export default function POS({ currentUser }: POSProps) {
  const perms = currentUser ? getUserPermissions(currentUser) : null;
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [categories, setCategories] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('عميل نقدي');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(17);
  const [paid, setPaid] = useState(0);
  const [invoiceId, setInvoiceId] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [visaAmount, setVisaAmount] = useState(0);
  const [autoPrint, setAutoPrint] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    generateInvoiceId();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [prods, clis, sett] = await Promise.all([
      getProducts(),
      getClients(),
      getSettings()
    ]);
    setProducts(prods);
    setClients(clis);
    setTax(sett.defaultTax || 17);
    
    // Extract categories
    const cats = ['الكل', ...new Set(prods.map(p => p.category))];
    setCategories(cats);
    setIsLoading(false);
  };

  const generateInvoiceId = () => {
    const now = new Date();
    const id = `INV-${now.getTime()}`;
    setInvoiceId(id);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      } else {
        alert('الكمية المتوفرة غير كافية!');
      }
    } else {
      if (product.quantity > 0) {
        setCart([...cart, { product, quantity: 1 }]);
      } else {
        alert('المنتج غير متوفر في المخزون!');
      }
    }
  };

  const confirmSale = async () => {
    if (cart.length === 0) return;
    
    const actualPaid = paymentMethod === 'mixed' ? cashAmount + visaAmount : paid;
    const subtotal = cart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
    const total = subtotal * (1 - discount / 100) * (1 + tax / 100);

    const invoice = {
      id: invoiceId,
      date: new Date().toISOString(),
      client: selectedClient,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.sellPrice,
        total: item.product.sellPrice * item.quantity,
        productId: item.product.id
      })),
      subtotal,
      discount,
      tax,
      total: parseFloat(total.toFixed(2)),
      paid: actualPaid,
      remaining: parseFloat((actualPaid - total).toFixed(2)),
      cashier: currentUser?.fullName || 'مدير',
      paymentMethod
    };

    const { error: invError } = await saveInvoice(invoice as any);
    if (invError) {
      alert('خطأ في حفظ الفاتورة: ' + invError.message);
      return;
    }

    // Update product quantities
    for (const item of cart) {
      const newQty = item.product.quantity - item.quantity;
      await saveProduct({ id: item.product.id, quantity: newQty });
    }

    // Handle debt
    if (actualPaid < total && selectedClient !== 'عميل نقدي') {
      const client = clients.find(c => c.name === selectedClient);
      if (client) {
         await saveClient({ id: client.id, debt: client.debt + (total - actualPaid) });
      }
    }

    alert('✅ تمت عملية البيع بنجاح');
    setCart([]);
    setPaid(0);
    generateInvoiceId();
    await loadData();
    setShowPaymentModal(false);
  };

  const handleBarcode = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && barcode.trim()) {
      const product = products.find(p => p.barcode === barcode.trim());
      if (product) {
        addToCart(product);
        setBarcode('');
      } else {
        alert('المنتج غير موجود!');
      }
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0);
  const total = subtotal * (1 - discount / 100) * (1 + tax / 100);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#1a1c2e] text-white" dir="rtl">
      {/* Products Grid */}
      <div className="flex-1 p-4 overflow-auto border-l border-gray-700">
        <div className="flex gap-4 mb-4">
           <input 
             type="text" 
             placeholder="ابحث بالاسم أو الباركود..." 
             value={searchProduct}
             onChange={e => setSearchProduct(e.target.value)}
             className="flex-1 bg-gray-800 border-gray-700 rounded-lg px-4 py-2"
           />
           <select 
             value={selectedCategory}
             onChange={e => setSelectedCategory(e.target.value)}
             className="bg-gray-800 border-gray-700 rounded-lg px-4 py-2"
           >
             {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 animate-pulse text-sky-400">جاري تحميل المنتجات من Supabase...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products
              .filter(p => (selectedCategory === 'الكل' || p.category === selectedCategory) && (p.name.includes(searchProduct) || p.barcode.includes(searchProduct)))
              .map(p => (
                <button 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className="bg-gray-800 hover:bg-gray-700 p-3 rounded-xl border border-gray-700 text-right transition-all transform active:scale-95"
                >
                  <p className="font-bold truncate">{p.name}</p>
                  <p className="text-sky-400 font-mono">{p.sellPrice} دج</p>
                  <p className="text-xs text-gray-400">المخزون: {p.quantity}</p>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Cart & Total */}
      <div className="w-full lg:w-96 bg-[#0f172a] shadow-2xl flex flex-col p-4">
        <h2 className="text-xl font-bold mb-4 flex justify-between">
           <span>🛒 السلة</span>
           <span className="text-yellow-400">{invoiceId}</span>
        </h2>
        
        <div className="flex-1 overflow-auto space-y-2 mb-4">
          {cart.map(item => (
            <div key={item.product.id} className="bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700">
              <div className="flex-1">
                 <p className="text-sm font-bold truncate">{item.product.name}</p>
                 <p className="text-xs text-sky-400">{item.quantity} x {item.product.sellPrice} دج</p>
              </div>
              <button 
                onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))}
                className="text-red-500 hover:bg-red-500/10 p-2 rounded"
              >✕</button>
            </div>
          ))}
          {cart.length === 0 && <div className="text-center text-gray-500 py-10 italic">السلة فارغة</div>}
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-700 space-y-3">
           <div className="flex justify-between text-lg">
              <span>المجموع:</span>
              <span className="font-black text-2xl text-yellow-400">{total.toFixed(2)} دج</span>
           </div>
           
           <div>
              <label className="text-xs text-gray-400 mb-1 block">العميل</label>
              <select 
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
           </div>

           <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">المدفوع</label>
                <input 
                  type="number" 
                  value={paid}
                  onChange={e => setPaid(Number(e.target.value))}
                  className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-green-400"
                />
              </div>
              <div className="w-20">
                 <label className="text-xs text-gray-400 mb-1 block">الخصم %</label>
                 <input 
                   type="number" 
                   value={discount}
                   onChange={e => setDiscount(Number(e.target.value))}
                   className="w-full bg-gray-800 border-gray-700 rounded-lg px-3 py-2 text-sm text-center"
                 />
              </div>
           </div>

           <button 
             onClick={confirmSale}
             disabled={cart.length === 0}
             className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 transition-all"
           >
             🚀 إصدار الفاتورة والمزامنة
           </button>
        </div>
        
        <div className="mt-4 flex gap-2">
           <input 
             ref={barcodeRef}
             type="text" 
             value={barcode}
             onChange={e => setBarcode(e.target.value)}
             onKeyDown={handleBarcode}
             autoFocus
             placeholder="امسح الباركود..."
             className="flex-1 bg-gray-800 border-gray-700 rounded px-2 py-1 text-xs"
           />
           <button onClick={() => setBarcode('')} className="bg-gray-700 px-2 py-1 rounded text-xs">مسح</button>
        </div>
      </div>
    </div>
  );
}
