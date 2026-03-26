import { useState, useEffect } from 'react';
import { Supplier, PurchaseInvoice, PurchaseItem, Product } from '../types';
import { getSuppliers, saveSupplier, deleteSupplier, getPurchaseInvoices, savePurchaseInvoice, deletePurchaseInvoice, getProducts, updateProductQuantity } from '../store';

export default function Purchases() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');
  
  // Products cache
  const [products, setProducts] = useState<Product[]>([]);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Invoices state
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Partial<PurchaseInvoice> | null>(null);
  
  // New invoice cart
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
  const [qty, setQty] = useState<number>(1);
  const [cost, setCost] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Payment state
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<PurchaseInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [supps, invs, prods] = await Promise.all([
      getSuppliers(),
      getPurchaseInvoices(),
      getProducts()
    ]);
    setSuppliers(supps);
    setInvoices(invs);
    setProducts(prods);
  };

  // --- Suppliers Methods ---
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name) return;
    await saveSupplier(editingSupplier);
    setShowSupplierModal(false);
    loadData();
  };

  const handleDeleteSupplier = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      await deleteSupplier(id);
      loadData();
    }
  };

  // --- Invoices Methods ---
  const openNewInvoice = () => {
    setCart([]);
    setEditingInvoice({
      invoiceNumber: `PI-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      supplierId: suppliers[0]?.id || 0,
      subtotal: 0,
      discount: 0,
      total: 0,
      paid: 0,
      remaining: 0,
      paymentStatus: 'unpaid',
      items: []
    });
    setSelectedProduct(products[0]?.id || '');
    const p = products[0];
    if (p) setCost(p.buyPrice);
    setShowInvoiceModal(true);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const p = products.find(prod => prod.id === Number(selectedProduct));
    if (!p) return;
    
    if (qty <= 0 || cost < 0) return;

    const newItem: PurchaseItem = {
      productId: p.id,
      productName: p.name,
      quantity: Number(qty),
      unitPrice: Number(cost),
      total: Number(qty) * Number(cost)
    };

    setCart([...cart, newItem]);
    
    // reset selection inputs
    setQty(1);
    setCost(p.buyPrice); // keep current selection's cost or reset? better to just keep it or reset to original
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice || cart.length === 0) {
      alert('يجب إضافة منتجات للفاتورة');
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const discount = Number(editingInvoice.discount || 0);
    const total = subtotal - discount;
    const paid = Number(editingInvoice.paid || 0);
    const remaining = total - paid;
    
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (paid >= total && total > 0) paymentStatus = 'paid';
    else if (paid > 0) paymentStatus = 'partial';

    const supplierId = Number(editingInvoice.supplierId);
    const supplier = suppliers.find(s => s.id === supplierId);

    const invoiceToSave = {
      ...editingInvoice,
      supplierId,
      supplierName: supplier?.name || 'مورد عام',
      items: cart,
      subtotal,
      discount,
      total,
      paid,
      remaining,
      paymentStatus
    };

    // Save invoice
    await savePurchaseInvoice(invoiceToSave);

    // Update Product Stock Automatically
    for (const item of cart) {
      if (item.productId) {
         // Add quantity to stock
         await updateProductQuantity(item.productId, item.quantity, 'add');
      }
    }

    // Update Supplier Balance if remaining > 0
    if (remaining > 0 && supplier) {
      const newBalance = (supplier.balance || 0) + remaining;
      await saveSupplier({ ...supplier, balance: newBalance });
    }

    setShowInvoiceModal(false);
    loadData();
    alert('تم حفظ فاتورة المشتريات وإضافة المخزون بنجاح ✅');
  };

  const handleDeleteInvoice = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟ (ملاحظة: لن يتم إرجاع المخزون تلقائياً)')) {
      await deletePurchaseInvoice(id);
      loadData();
    }
  };

  const handlePurchaseBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim() !== '') {
      e.preventDefault();
      const code = barcodeInput.trim();
      const p = products.find(prod => prod.barcode === code);
      if (p) {
        // Auto add 1 quantity of this product
        const existingIndex = cart.findIndex(c => c.productId === p.id);
        if (existingIndex >= 0) {
          const newCart = [...cart];
          newCart[existingIndex].quantity += 1;
          newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice;
          setCart(newCart);
        } else {
          setCart([...cart, {
            productId: p.id,
            productName: p.name,
            quantity: 1,
            unitPrice: p.buyPrice,
            total: p.buyPrice
          }]);
        }
        setBarcodeInput('');
      } else {
        alert('حدث خطأ: منتج غير موجود بهذا الباركود');
      }
    }
  };

  const openPayModal = (inv: PurchaseInvoice) => {
    setPaymentInvoice(inv);
    setPaymentAmount(inv.remaining);
    setShowPayModal(true);
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice || paymentAmount <= 0 || paymentAmount > paymentInvoice.remaining) return;

    // Update invoice
    const newPaid = (paymentInvoice.paid || 0) + paymentAmount;
    const newRemaining = paymentInvoice.total - newPaid;
    let newStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (newPaid >= paymentInvoice.total && paymentInvoice.total > 0) newStatus = 'paid';
    else if (newPaid > 0) newStatus = 'partial';

    await savePurchaseInvoice({ ...paymentInvoice, paid: newPaid, remaining: newRemaining, paymentStatus: newStatus });

    // Update supplier
    if (paymentInvoice.supplierId) {
       const supplier = suppliers.find(s => s.id === paymentInvoice.supplierId);
       if (supplier) {
         const newBal = Math.max(0, (supplier.balance || 0) - paymentAmount);
         await saveSupplier({ ...supplier, balance: newBal });
       }
    }

    setShowPayModal(false);
    loadData();
    alert('تم الدفع وتحديث رصيد المورد بنجاح ✅');
  };

  return (
    <div className="p-4 h-screen overflow-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-teal-400 mb-6 font-arabic text-center">📦 إدارة المشتريات والموردين</h1>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-8 py-2 rounded-full font-bold transition-all ${activeTab === 'invoices' ? 'bg-teal-600 text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          فواتير المشتريات
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-8 py-2 rounded-full font-bold transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          الموردين
        </button>
      </div>

      {/* --- INVOICES TAB --- */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-200">سجل المشتروات</h2>
            <button onClick={openNewInvoice} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md">
              ➕ فاتورة شراء جديدة
            </button>
          </div>
          
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-300">
                <tr>
                  <th className="p-3 text-right">رقم الفاتورة</th>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">المورد</th>
                  <th className="p-3 text-center">الإجمالي</th>
                  <th className="p-3 text-center">المدفوع</th>
                  <th className="p-3 text-center">الباقي</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {invoices.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500">لا توجد فواتير شراء حالياً</td></tr>
                )}
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 font-bold text-white">{inv.invoiceNumber}</td>
                    <td className="p-3 text-gray-400">{inv.date}</td>
                    <td className="p-3 font-bold text-teal-400">{inv.supplierName}</td>
                    <td className="p-3 text-center font-bold">{inv.total.toFixed(2)}</td>
                    <td className="p-3 text-center text-green-400">{inv.paid?.toFixed(2)}</td>
                    <td className="p-3 text-center text-red-400">{inv.remaining?.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        inv.paymentStatus === 'paid' ? 'bg-green-900/50 text-green-400 border border-green-500/30' : 
                        inv.paymentStatus === 'partial' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30' : 
                        'bg-red-900/50 text-red-400 border border-red-500/30'
                      }`}>
                        {inv.paymentStatus === 'paid' ? 'خالص' : inv.paymentStatus === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {inv.remaining > 0 && (
                          <button onClick={() => openPayModal(inv)} className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded transition-colors text-xs font-bold shadow">
                            دفع الباقي
                          </button>
                        )}
                        <button onClick={() => handleDeleteInvoice(inv.id!)} className="bg-red-900/50 text-red-300 px-2.5 py-1 rounded hover:bg-red-600 hover:text-white transition-colors text-xs">
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUPPLIERS TAB --- */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-200">قائمة الموردين</h2>
            <button onClick={() => { setEditingSupplier({ name: '', phone: '', address: '', balance: 0 }); setShowSupplierModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md">
              ➕ إضافة مورد
            </button>
          </div>
          
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-300">
                <tr>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">العنوان</th>
                  <th className="p-3 text-center border-r border-gray-700">مطلوب له (مستحقات)</th>
                  <th className="p-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {suppliers.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">لا يوجد موردين مسجلين</td></tr>
                )}
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 font-bold text-white">{s.name}</td>
                    <td className="p-3 text-gray-400">{s.phone || '-'}</td>
                    <td className="p-3 text-gray-400">{s.address || '-'}</td>
                    <td className="p-3 text-center border-r border-gray-700 font-bold text-red-400 text-lg">{s.balance?.toFixed(2) || '0.00'}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => { setEditingSupplier(s); setShowSupplierModal(true); }} className="bg-gray-700 text-white px-2.5 py-1 rounded hover:bg-gray-600 transition-colors text-xs">تعديل</button>
                        <button onClick={() => handleDeleteSupplier(s.id!)} className="bg-red-900/50 text-red-300 px-2.5 py-1 rounded hover:bg-red-600 hover:text-white transition-colors text-xs">حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT SUPPLIER MODAL --- */}
      {showSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSupplierModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-gray-600 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <h3 className="font-bold text-indigo-400 text-center">{editingSupplier.id ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}</h3>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">اسم المورد *</label>
                <input type="text" required value={editingSupplier.name} onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">رقم الهاتف</label>
                <input type="text" value={editingSupplier.phone} onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" dir="ltr" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">العنوان</label>
                <input type="text" value={editingSupplier.address} onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">الرصيد المبدئي (ديون سابقة)</label>
                <input type="number" value={editingSupplier.balance} onChange={e => setEditingSupplier({...editingSupplier, balance: Number(e.target.value)})} className="w-full bg-gray-900 border border-red-500/50 rounded-lg px-3 py-2 text-white font-bold" />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all">حفظ</button>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 rounded-xl transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW PURCHASE INVOICE MODAL --- */}
      {showInvoiceModal && editingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-4xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-teal-400 text-lg">📝 فاتورة شراء / توريد جديدة</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 flex flex-col lg:flex-row gap-6">
              {/* Right Side - Add Items */}
              <div className="lg:w-1/3 space-y-4 border-l border-gray-700 pl-6">
                 <div>
                   <label className="text-xs text-gray-400 mb-1 block">رقم الفاتورة (المرجعي)</label>
                   <input type="text" value={editingInvoice.invoiceNumber} onChange={e => setEditingInvoice({...editingInvoice, invoiceNumber: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
                 </div>
                 <div>
                   <label className="text-xs text-gray-400 mb-1 block">اختر المورد</label>
                   <select value={editingInvoice.supplierId} onChange={e => setEditingInvoice({...editingInvoice, supplierId: Number(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                     {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 </div>
                 <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-teal-400 font-bold mb-3 flex justify-between items-center">
                      <span>📦 إضافة منتج بالفاتورة</span>
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-green-400 mb-1 block">🔍 إضافة بالباركود سريعاً</label>
                        <input type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handlePurchaseBarcode} placeholder="مرر الباركود هنا..." className="w-full bg-gray-900 border border-green-500/50 rounded-lg px-3 py-2 text-white text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400" autoFocus />
                      </div>
                      <div className="text-center text-xs text-gray-500">أو إضافة يدوياً:</div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">المنتج</label>
                        <select value={selectedProduct} onChange={(e) => {
                          const val = Number(e.target.value);
                          setSelectedProduct(val);
                          const p = products.find(prod => prod.id === val);
                          if(p) setCost(p.buyPrice);
                        }} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm custom-scrollbar">
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (المخزون: {p.quantity})</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">الكمية المستلمة</label>
                          <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">تكلفة الوحدة</label>
                          <input type="number" min="0" value={cost} onChange={e => setCost(Number(e.target.value))} className="w-full bg-gray-900 border border-teal-500/50 rounded-lg px-3 py-2 text-white text-center font-bold" />
                        </div>
                      </div>
                      <button type="button" onClick={addToCart} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg transition-all mt-2">
                        إضافة للقائمة ↓
                      </button>
                    </div>
                 </div>
              </div>

              {/* Left Side - Cart & Totals */}
              <div className="lg:w-2/3 flex flex-col">
                <div className="flex-1 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 text-gray-300 sticky top-0">
                      <tr>
                        <th className="p-2 text-right w-1/2">المنتج</th>
                        <th className="p-2 text-center">الكمية</th>
                        <th className="p-2 text-center">التكلفة</th>
                        <th className="p-2 text-center">الإجمالي</th>
                        <th className="p-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 overflow-y-auto max-h-[250px] custom-scrollbar">
                      {cart.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-600">لم يتم إضافة منتجات</td></tr>}
                      {cart.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-800/50">
                          <td className="p-2 font-bold text-white">{c.productName}</td>
                          <td className="p-2 text-center text-teal-400 font-bold">{c.quantity}</td>
                          <td className="p-2 text-center text-gray-300">{c.unitPrice.toFixed(2)}</td>
                          <td className="p-2 text-center text-yellow-400 font-bold">{c.total.toFixed(2)}</td>
                          <td className="p-2 text-center"><button onClick={() => removeFromCart(i)} className="text-red-500 hover:bg-red-900/40 w-6 h-6 rounded-full flex items-center justify-center">✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form onSubmit={handleSaveInvoice} className="mt-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
                  {(() => {
                    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
                    const discount = Number(editingInvoice.discount || 0);
                    const total = subtotal - discount;
                    const paid = Number(editingInvoice.paid || 0);
                    const remaining = total - paid;
                    return (
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center bg-gray-900 px-4 py-2 rounded-lg border border-gray-600">
                          <span className="text-gray-400">إجمالي المشتريات:</span>
                          <span className="text-lg font-bold text-white">{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">الخصم المكتسب</label>
                            <input type="number" min="0" max={subtotal} value={editingInvoice.discount || 0} onChange={e => setEditingInvoice({...editingInvoice, discount: Number(e.target.value)})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">الصافي للدفع</label>
                            <div className="w-full bg-yellow-900/20 border border-yellow-500/50 rounded-lg px-3 py-2 text-yellow-400 text-center font-bold text-lg">{total.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block text-green-400">المدفوع من الخزينة</label>
                            <input type="number" min="0" max={total} value={editingInvoice.paid || 0} onChange={e => setEditingInvoice({...editingInvoice, paid: Number(e.target.value)})} className="w-full bg-green-900/20 border border-green-500/50 rounded-lg px-3 py-2 text-green-400 font-bold text-center text-lg" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block text-red-400">الباقي (دين للمورد)</label>
                            <div className="w-full bg-red-900/20 border border-red-500/50 rounded-lg px-3 py-2 text-red-400 text-center font-bold text-lg">{remaining.toFixed(2)}</div>
                          </div>
                        </div>
                        <button type="submit" disabled={cart.length === 0} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all mt-2 shadow-lg text-lg">
                          ✅ حفظ الفاتورة وإضافة للمخزون
                        </button>
                      </div>
                    )
                  })()}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- PAY UNPAID INVOICE MODAL --- */}
      {showPayModal && paymentInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm border border-gray-600 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <h3 className="font-bold text-green-400 text-center">تسديد دفعة للمورد</h3>
            </div>
            <form onSubmit={handlePayInvoice} className="p-5 space-y-4">
              <div className="bg-gray-900 p-3 rounded-xl border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">المورد: <span className="text-white font-bold">{paymentInvoice.supplierName}</span></p>
                <p className="text-xs text-gray-400">إجمالي الفاتورة: <span className="text-white">{paymentInvoice.total.toFixed(2)}</span></p>
              </div>
              <div>
                <label className="text-xs text-red-400 mb-1 block">الباقي (المطلوب دفعه)</label>
                <input type="text" readOnly value={paymentInvoice.remaining.toFixed(2)} className="w-full bg-red-900/20 border border-red-500/50 rounded-lg px-3 py-2 text-red-400 font-bold" />
              </div>
              <div>
                <label className="text-xs text-green-400 mb-1 block">المبلغ المراد سداده الآن</label>
                <input type="number" min="0" max={paymentInvoice.remaining} step="0.01" required autoFocus value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full bg-gray-900 border border-green-500/50 rounded-lg px-3 py-2 text-white font-bold text-xl text-center" />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg">تسديد الدفعة</button>
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 rounded-xl transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
