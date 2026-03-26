import { useState, useEffect } from 'react';
import { Supplier, PurchaseInvoice, PurchaseItem, Product } from '../types';
import { getSuppliers, saveSupplier, deleteSupplier, getPurchaseInvoices, savePurchaseInvoice, deletePurchaseInvoice, getProducts, updateProductQuantity } from '../store';

export default function Purchases() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Products cache
  const [products, setProducts] = useState<Product[]>([]);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Statement state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);

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
    setIsLoaded(true);
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen();
    }
  };

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

  const openStatement = (supplier: Supplier) => {
    setStatementSupplier(supplier);
    setShowStatementModal(true);
  };

  const printStatement = () => {
    if (!statementSupplier) return;
    const supplierInvoices = invoices.filter(inv => inv.supplierId === statementSupplier.id);
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;

    const totalInvoiced = supplierInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = supplierInvoices.reduce((sum, inv) => sum + inv.paid, 0);

    win.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف حساب مورد - ${statementSupplier.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
            body { font-family: 'Tajawal', sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
            th { background: #f0f0f0; }
            .summary { margin-top: 20px; font-weight: bold; background: #f9f9f9; padding: 15px; border-radius: 8px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h1>كشف حساب مورد</h1>
            <h2>${statementSupplier.name}</h2>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الفاتورة</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${supplierInvoices.map(inv => `
                <tr>
                  <td>${inv.date}</td>
                  <td>${inv.invoiceNumber}</td>
                  <td>${inv.total.toFixed(2)}</td>
                  <td>${inv.paid.toFixed(2)}</td>
                  <td>${inv.remaining.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <p>إجمالي المشتريات: ${totalInvoiced.toFixed(2)}</p>
            <p>إجمالي المسدد: ${totalPaid.toFixed(2)}</p>
            <p style="color:red">الرصيد الحالي المستحق للمورد: ${statementSupplier.balance.toFixed(2)}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
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
    <div className={`p-4 h-screen overflow-auto bg-[#0f172a] text-gray-100 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} dir="rtl">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-teal-400 font-arabic text-center">📦 إدارة المشتريات والموردين</h1>
        <button 
          onClick={toggleFullscreen}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm border border-gray-700 flex items-center gap-2 transition-all shadow-sm"
        >
          {isFullscreen ? '🖥️ تصغير الشاشة' : '📺 ملء الشاشة'}
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 md:flex-none px-6 md:px-10 py-3 rounded-2xl font-bold transition-all ${activeTab === 'invoices' ? 'bg-teal-600 text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          فواتير المشتريات
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 md:flex-none px-6 md:px-10 py-3 rounded-2xl font-bold transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          الموردين
        </button>
      </div>

      {/* --- INVOICES TAB --- */}
      {activeTab === 'invoices' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-300">سجل المشتريات</h2>
            <button onClick={openNewInvoice} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg">
              ➕ فاتورة شراء جديدة
            </button>
          </div>
          
          <div className="bg-[#1e293b]/50 backdrop-blur-md rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/80 text-gray-400">
                  <tr>
                    <th className="p-4 text-right">رقم الفاتورة</th>
                    <th className="p-4 text-right">التاريخ</th>
                    <th className="p-4 text-right">المورد</th>
                    <th className="p-4 text-center">الإجمالي</th>
                    <th className="p-4 text-center">المدفوع</th>
                    <th className="p-4 text-center">الباقي</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {invoices.length === 0 && (
                    <tr><td colSpan={8} className="p-10 text-center text-gray-500">لا توجد فواتير سجلت بعد</td></tr>
                  )}
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white">{inv.invoiceNumber}</td>
                      <td className="p-4 text-gray-400">{inv.date}</td>
                      <td className="p-4 font-bold text-teal-400">{inv.supplierName}</td>
                      <td className="p-4 text-center font-bold text-white">{inv.total.toFixed(2)}</td>
                      <td className="p-4 text-center text-green-400">{inv.paid?.toFixed(2)}</td>
                      <td className="p-4 text-center text-red-400 font-bold">{inv.remaining?.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold ${
                          inv.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                          inv.paymentStatus === 'partial' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {inv.paymentStatus === 'paid' ? 'خالص' : inv.paymentStatus === 'partial' ? 'جزئي' : 'غير مدفوع'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {inv.remaining > 0 && (
                            <button onClick={() => openPayModal(inv)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-all text-xs font-bold">
                              دفع
                            </button>
                          )}
                          <button onClick={() => handleDeleteInvoice(inv.id!)} className="bg-red-900/30 text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all text-xs">
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
        </div>
      )}

      {/* --- SUPPLIERS TAB --- */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-gray-300">قائمة الموردين</h2>
            <button onClick={() => { setEditingSupplier({ name: '', phone: '', address: '', balance: 0 }); setShowSupplierModal(true); }} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg">
              ➕ إضافة مورد جديد
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 && (
              <div className="col-span-full p-10 text-center text-gray-500 bg-gray-800/20 rounded-2xl border border-gray-700">لا يوجد موردين مسجلين حالياً</div>
            )}
            {suppliers.map(s => (
              <div key={s.id} className="bg-[#1e293b]/50 backdrop-blur-md p-5 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-all shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-lg">{s.name}</h3>
                  </div>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p className="truncate">📱 {s.phone || '-'}</p>
                    <p className="truncate">📍 {s.address || '-'}</p>
                  </div>
                  <div className="mt-4 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">المبلغ المستحق (له):</p>
                    <p className={`text-xl font-black ${s.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>{s.balance?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => openStatement(s)} className="col-span-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition-all text-sm font-bold border border-gray-600">
                    📄 كشف حساب
                  </button>
                  <button onClick={() => { setEditingSupplier(s); setShowSupplierModal(true); }} className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white py-2 rounded-xl transition-all text-xs font-bold border border-indigo-500/20">تعديل</button>
                  <button onClick={() => handleDeleteSupplier(s.id!)} className="bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white py-2 rounded-xl transition-all text-xs font-bold border border-red-500/20">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ACCOUNT STATEMENT MODAL --- */}
      {showStatementModal && statementSupplier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setShowStatementModal(false)}>
          <div className="bg-[#0f172a] rounded-3xl w-full max-w-4xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-white">كشف حساب مورد: {statementSupplier.name}</h3>
              <div className="flex gap-2">
                <button onClick={printStatement} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold text-sm">🖨️ طباعة</button>
                <button onClick={() => setShowStatementModal(false)} className="text-gray-400 hover:text-white p-2 text-xl">✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">إجمالي المشتريات</p>
                  <p className="text-xl font-bold text-white">{invoices.filter(inv => inv.supplierId === statementSupplier.id).reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800">
                  <p className="text-xs text-gray-500 mb-1">إجمالي المسدد</p>
                  <p className="text-xl font-bold text-green-400">{invoices.filter(inv => inv.supplierId === statementSupplier.id).reduce((sum, inv) => sum + inv.paid, 0).toFixed(2)}</p>
                </div>
                <div className="bg-red-900/20 p-4 rounded-2xl border border-red-900/30">
                  <p className="text-xs text-red-500 mb-1">الرصيد المتبقي (له)</p>
                  <p className="text-xl font-black text-red-400">{statementSupplier.balance?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="p-3 text-right">التاريخ</th>
                      <th className="p-3 text-right">رقم الفاتورة</th>
                      <th className="p-3 text-center">المبلغ</th>
                      <th className="p-3 text-center">المدفوع</th>
                      <th className="p-3 text-center">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {invoices.filter(inv => inv.supplierId === statementSupplier.id).map(inv => (
                      <tr key={inv.id} className="hover:bg-white/5 transition-all">
                        <td className="p-3 text-gray-400">{inv.date}</td>
                        <td className="p-3 font-medium text-white">{inv.invoiceNumber}</td>
                        <td className="p-3 text-center font-bold">{inv.total.toFixed(2)}</td>
                        <td className="p-3 text-center text-green-400">{inv.paid?.toFixed(2)}</td>
                        <td className="p-3 text-center text-red-400">{inv.remaining?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
            
            <div className="flex-1 overflow-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
              {/* Right Side - Add Items */}
              <div className="w-full lg:w-1/3 space-y-4 lg:border-l lg:border-gray-700 lg:pl-6 order-2 lg:order-1">
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
                        <input type="text" value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handlePurchaseBarcode} placeholder="مرر الباركود هنا..." className="w-full bg-gray-900 border border-green-500/50 rounded-lg px-3 py-2 text-white text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400" />
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
                      <button type="button" onClick={addToCart} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl transition-all mt-2 shadow-lg">
                        إضافة للقائمة ↓
                      </button>
                    </div>
                 </div>
              </div>

              {/* Left Side - Cart & Totals */}
              <div className="w-full lg:w-2/3 flex flex-col order-1 lg:order-2">
                <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-700 overflow-hidden flex flex-col min-h-[300px]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800 text-gray-300 sticky top-0">
                        <tr>
                          <th className="p-3 text-right">المنتج</th>
                          <th className="p-3 text-center">الكمية</th>
                          <th className="p-3 text-center">التكلفة</th>
                          <th className="p-3 text-center">الإجمالي</th>
                          <th className="p-3 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 overflow-y-auto max-h-[250px] custom-scrollbar">
                        {cart.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-600">لم يتم إضافة منتجات للفاتورة بعد</td></tr>}
                        {cart.map((c, i) => (
                          <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 font-bold text-white">{c.productName}</td>
                            <td className="p-3 text-center text-teal-400 font-bold">{c.quantity}</td>
                            <td className="p-3 text-center text-gray-400">{c.unitPrice.toFixed(2)}</td>
                            <td className="p-3 text-center text-yellow-400 font-bold">{c.total.toFixed(2)}</td>
                            <td className="p-3 text-center"><button onClick={() => removeFromCart(i)} className="text-red-500 hover:bg-red-900/40 w-8 h-8 rounded-full flex items-center justify-center transition-all">✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <form onSubmit={handleSaveInvoice} className="mt-4 bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
                  {(() => {
                    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
                    const discount = Number(editingInvoice.discount || 0);
                    const total = subtotal - discount;
                    const paid = Number(editingInvoice.paid || 0);
                    const remaining = total - paid;
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center bg-gray-900/50 px-6 py-3 rounded-xl border border-gray-700">
                          <span className="text-gray-400 font-bold text-sm">إجمالي الفاتورة:</span>
                          <span className="text-2xl font-black text-white">{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">الخصم المكتسب</label>
                            <input type="number" min="0" max={subtotal} value={editingInvoice.discount || 0} onChange={e => setEditingInvoice({...editingInvoice, discount: Number(e.target.value)})} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-center font-bold" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">الصافي للدفع</label>
                            <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 text-yellow-500 text-center font-black text-xl">{total.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-green-500 mb-1 block">المدفوع نقداً</label>
                            <input type="number" min="0" max={total} value={editingInvoice.paid || 0} onChange={e => setEditingInvoice({...editingInvoice, paid: Number(e.target.value)})} className="w-full bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 text-green-400 font-black text-center text-xl shadow-inner shadow-green-900/20" />
                          </div>
                          <div>
                            <label className="text-xs text-red-500 mb-1 block">الباقي (دين للمورد)</label>
                            <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-red-400 text-center font-black text-xl">{remaining.toFixed(2)}</div>
                          </div>
                        </div>
                        <button type="submit" disabled={cart.length === 0} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-4 rounded-2xl transition-all mt-2 shadow-xl text-lg flex items-center justify-center gap-2">
                          {cart.length === 0 ? '❌ أضف منتجات أولاً' : '✅ حفظ الفاتورة وإضافة للمخزون'}
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
