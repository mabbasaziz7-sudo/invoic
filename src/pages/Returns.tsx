import { useState, useEffect } from 'react';
import { Invoice, ReturnRecord, ReturnItem, Product } from '../types';
import { getInvoices, getProducts, saveProduct, getReturns, saveReturn, getSettings } from '../store';

export default function Returns() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [exchangeProductId, setExchangeProductId] = useState<number | null>(null);
  const [exchangeQty, setExchangeQty] = useState(1);
  const [showNewReturn, setShowNewReturn] = useState(false);
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const settings = getSettings();

  useEffect(() => {
    const load = async () => {
      setInvoices(await getInvoices());
      setProducts(await getProducts());
      setReturns(await getReturns());
    };
    load();
  }, []);

  const findInvoice = () => {
    const inv = invoices.find(i => i.id === searchInvoice.trim());
    if (inv) {
      setSelectedInvoice(inv);
      setReturnItems([]);
      setShowNewReturn(true);
    } else {
      alert('لم يتم العثور على الفاتورة!');
    }
  };

  const toggleReturnItem = (item: { name: string; quantity: number; price: number; total: number; productId?: number }, qty: number, reason: string) => {
    const existing = returnItems.find(ri => ri.name === item.name);
    if (existing) {
      setReturnItems(returnItems.filter(ri => ri.name !== item.name));
    } else {
      const product = products.find(p => p.name === item.name);
      setReturnItems([...returnItems, {
        productId: product?.id || item.productId || 0,
        name: item.name,
        quantity: Math.min(qty, item.quantity),
        price: item.price,
        total: item.price * Math.min(qty, item.quantity),
        reason: reason || 'منتج تالف',
      }]);
    }
  };

  const updateReturnQty = (name: string, qty: number) => {
    setReturnItems(returnItems.map(ri =>
      ri.name === name ? { ...ri, quantity: qty, total: ri.price * qty } : ri
    ));
  };

  const updateReturnReason = (name: string, reason: string) => {
    setReturnItems(returnItems.map(ri =>
      ri.name === name ? { ...ri, reason } : ri
    ));
  };

  const returnTotal = returnItems.reduce((s, i) => s + i.total, 0);

  const confirmReturn = async () => {
    if (returnItems.length === 0) {
      alert('اختر منتجات للإرجاع!');
      return;
    }
    if (!selectedInvoice) return;

    const now = new Date();
    const returnId = `RET-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    let exchangeItems: { name: string; quantity: number; price: number; total: number }[] = [];
    let refundAmount = returnTotal;

    // 1. Update stock in Supabase for returned items
    for (const item of returnItems) {
      const p = products.find(prod => prod.id === item.productId);
      if (p) await saveProduct({ ...p, quantity: p.quantity + item.quantity });
    }

    if (returnType === 'exchange' && exchangeProductId) {
      const exchangeProduct = products.find(p => p.id === exchangeProductId);
      if (exchangeProduct) {
        const exchangeTotal = exchangeProduct.sellPrice * exchangeQty;
        exchangeItems = [{
          name: exchangeProduct.name,
          quantity: exchangeQty,
          price: exchangeProduct.sellPrice,
          total: exchangeTotal,
        }];
        refundAmount = returnTotal - exchangeTotal;

        // 2. Deduct exchange product from stock
        await saveProduct({ ...exchangeProduct, quantity: exchangeProduct.quantity - exchangeQty });
      }
    }

    const record: ReturnRecord = {
      id: returnId,
      invoiceId: selectedInvoice.id,
      date: now.toISOString().split('T')[0],
      items: returnItems,
      total: returnTotal,
      type: returnType,
      exchangeItems,
      refundAmount,
      client: selectedInvoice.client,
      cashier: selectedInvoice.cashier,
    };

    await saveReturn(record);
    setReturns(await getReturns());
    setProducts(await getProducts());

    // Print return receipt
    printReturnReceipt(record);

    setShowNewReturn(false);
    setSelectedInvoice(null);
    setReturnItems([]);
    setSearchInvoice('');
    alert('تمت عملية الإرجاع بنجاح! ✅');
  };

  const printReturnReceipt = (ret: ReturnRecord) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><title>إيصال ${ret.type === 'return' ? 'إرجاع' : 'تبديل'}</title>
      <style>
        body { font-family: monospace; text-align: center; padding: 20px; font-size: 14px; max-width: 300px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 4px; text-align: right; font-size: 12px; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .title { font-size: 16px; font-weight: bold; color: #c00; }
        .logo { width: 50px; height: 50px; object-fit: contain; margin: 0 auto 8px; display: block; }
      </style></head><body>
      ${settings.logo && settings.showLogoOnInvoice !== false ? `<img class="logo" src="${settings.logo}" alt="logo" onerror="this.style.display='none'" />` : ''}
      <h2>${settings.storeName}</h2>
      <p>هاتف: ${settings.phone}</p>
      <div class="line"></div>
      <p class="title">إيصال ${ret.type === 'return' ? 'مرتجعات' : 'تبديل'}</p>
      <p>رقم العملية: ${ret.id}</p>
      <p>فاتورة أصلية: ${ret.invoiceId}</p>
      <p>التاريخ: ${ret.date}</p>
      <div class="line"></div>
      <h4>المنتجات المرتجعة:</h4>
      <table>
        <tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th><th>السبب</th></tr>
        ${ret.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.total.toFixed(2)}</td><td>${i.reason}</td></tr>`).join('')}
      </table>
      ${ret.type === 'exchange' && ret.exchangeItems && ret.exchangeItems.length > 0 ? `
        <div class="line"></div>
        <h4>المنتجات البديلة:</h4>
        <table>
          <tr><th>المنتج</th><th>الكمية</th><th>المبلغ</th></tr>
          ${ret.exchangeItems.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.total.toFixed(2)}</td></tr>`).join('')}
        </table>
      ` : ''}
      <div class="line"></div>
      <p><strong>مبلغ المرتجعات:</strong> ${ret.total.toFixed(2)} ${settings.currency}</p>
      <p><strong>المبلغ ${ret.refundAmount >= 0 ? 'المسترد' : 'المطلوب'}:</strong> ${Math.abs(ret.refundAmount).toFixed(2)} ${settings.currency}</p>
      <div class="line"></div>
      <p>العميل: ${ret.client}</p>
      <p>الكاشير: ${ret.cashier}</p>
      <br/><p>${settings.storeName} - Bakhcha Pro</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const reasons = ['منتج تالف', 'منتج منتهي الصلاحية', 'خطأ في الطلب', 'عدم رضا العميل', 'عيب في التصنيع', 'أخرى'];

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-4">🔄 المرتجعات والتبديل</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('new')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          ➕ عملية إرجاع/تبديل جديدة
        </button>
        <button onClick={() => setTab('history')} className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          📋 سجل المرتجعات
        </button>
      </div>

      {tab === 'new' && (
        <div>
          {/* Search Invoice */}
          <div className="bg-[#1e293b] rounded-2xl p-4 mb-4 border border-gray-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-3">🔍 البحث عن الفاتورة</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && findInvoice()}
                placeholder="أدخل رقم الفاتورة (مثال: INV-20260320...)"
                className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2.5 text-sm"
              />
              <button onClick={findInvoice} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all">
                🔎 بحث
              </button>
            </div>

            {/* Quick select from recent invoices */}
            <div className="mt-3">
              <p className="text-gray-400 text-xs mb-2">أو اختر من آخر الفواتير:</p>
              <div className="flex gap-2 flex-wrap">
                {invoices.slice(0, 5).map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => { setSelectedInvoice(inv); setReturnItems([]); setShowNewReturn(true); }}
                    className="bg-gray-800 hover:bg-gray-700 text-yellow-400 px-3 py-1.5 rounded-lg text-xs border border-gray-600 transition-all"
                  >
                    {inv.id} ({inv.total.toFixed(2)} {settings.currency})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Return Form */}
          {showNewReturn && selectedInvoice && (
            <div className="bg-[#1e293b] rounded-2xl p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-green-400">📄 الفاتورة: {selectedInvoice.id}</h3>
                  <p className="text-gray-400 text-sm">التاريخ: {selectedInvoice.date} | العميل: {selectedInvoice.client} | الإجمالي: {selectedInvoice.total.toFixed(2)} {settings.currency}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setReturnType('return')} className={`px-4 py-2 rounded-xl font-bold text-sm ${returnType === 'return' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    ↩️ إرجاع
                  </button>
                  <button onClick={() => setReturnType('exchange')} className={`px-4 py-2 rounded-xl font-bold text-sm ${returnType === 'exchange' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    🔄 تبديل
                  </button>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="overflow-auto rounded-xl border border-gray-700 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="p-2">اختيار</th>
                      <th className="p-2">السبب</th>
                      <th className="p-2">كمية الإرجاع</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2">الكمية الأصلية</th>
                      <th className="p-2">السعر</th>
                      <th className="p-2">المنتج</th>
                      <th className="p-2">#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, idx) => {
                      const isSelected = returnItems.some(ri => ri.name === item.name);
                      const retItem = returnItems.find(ri => ri.name === item.name);
                      return (
                        <tr key={idx} className={`border-b border-gray-800 ${isSelected ? 'bg-red-900/30' : 'hover:bg-gray-700/50'}`}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleReturnItem(item, 1, 'منتج تالف')}
                              className="w-4 h-4 accent-red-500"
                            />
                          </td>
                          <td className="p-2">
                            {isSelected && (
                              <select
                                value={retItem?.reason || 'منتج تالف'}
                                onChange={(e) => updateReturnReason(item.name, e.target.value)}
                                className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-xs w-full"
                              >
                                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isSelected && (
                              <input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={retItem?.quantity || 1}
                                onChange={(e) => updateReturnQty(item.name, Math.min(Number(e.target.value), item.quantity))}
                                className="w-16 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-center text-sm"
                              />
                            )}
                          </td>
                          <td className="p-2 text-center font-bold">{item.total.toFixed(2)}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-center">{item.price.toFixed(2)}</td>
                          <td className="p-2 text-right font-bold">{item.name}</td>
                          <td className="p-2 text-center">{idx + 1}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Exchange Product Selection */}
              {returnType === 'exchange' && (
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-orange-600/50">
                  <h4 className="text-orange-400 font-bold mb-3">🔄 اختر المنتج البديل</h4>
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-gray-400 mb-1 block">المنتج البديل</label>
                      <select
                        value={exchangeProductId || ''}
                        onChange={(e) => setExchangeProductId(Number(e.target.value))}
                        className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">-- اختر منتج --</option>
                        {products.filter(p => p.quantity > 0).map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {p.sellPrice} {settings.currency} (متوفر: {p.quantity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-400 mb-1 block">الكمية</label>
                      <input
                        type="number"
                        min={1}
                        value={exchangeQty}
                        onChange={(e) => setExchangeQty(Number(e.target.value))}
                        className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm text-center"
                      />
                    </div>
                    {exchangeProductId && (() => {
                      const ep = products.find(p => p.id === exchangeProductId);
                      if (!ep) return null;
                      const exchangeTotal = ep.sellPrice * exchangeQty;
                      const diff = returnTotal - exchangeTotal;
                      return (
                        <div className="bg-gray-900 rounded-lg p-2 text-sm">
                          <p className="text-gray-400">قيمة التبديل: <span className="text-white font-bold">{exchangeTotal.toFixed(2)} {settings.currency}</span></p>
                          <p className={`${diff >= 0 ? 'text-green-400' : 'text-red-400'} font-bold`}>
                            {diff >= 0 ? `مسترد للعميل: ${diff.toFixed(2)}` : `مطلوب من العميل: ${Math.abs(diff).toFixed(2)}`} {settings.currency}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Return Summary */}
              <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div className="text-xl">
                    <span className="text-gray-400">مبلغ المرتجعات: </span>
                    <span className="text-red-400 font-black text-2xl">{returnTotal.toFixed(2)} {settings.currency}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    عدد المنتجات المرتجعة: <span className="text-white font-bold">{returnItems.length}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={confirmReturn}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-base transition-all"
                >
                  ✅ تأكيد {returnType === 'return' ? 'الإرجاع' : 'التبديل'}
                </button>
                <button
                  onClick={() => { setShowNewReturn(false); setSelectedInvoice(null); setReturnItems([]); }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl font-bold text-base transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="flex gap-4 mb-4">
            <div className="bg-red-800/50 rounded-xl px-4 py-2 border border-red-600">
              <span className="text-red-300 text-sm">إجمالي المرتجعات: </span>
              <span className="text-white font-bold">{returns.filter(r => r.type === 'return').reduce((s, r) => s + r.total, 0).toFixed(2)} {settings.currency}</span>
            </div>
            <div className="bg-orange-800/50 rounded-xl px-4 py-2 border border-orange-600">
              <span className="text-orange-300 text-sm">عمليات التبديل: </span>
              <span className="text-white font-bold">{returns.filter(r => r.type === 'exchange').length}</span>
            </div>
            <div className="bg-blue-800/50 rounded-xl px-4 py-2 border border-blue-600">
              <span className="text-blue-300 text-sm">إجمالي العمليات: </span>
              <span className="text-white font-bold">{returns.length}</span>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2">إجراء</th>
                  <th className="p-2">المسترد</th>
                  <th className="p-2">المبلغ</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2">العميل</th>
                  <th className="p-2">الفاتورة الأصلية</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">رقم العملية</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(ret => (
                  <tr key={ret.id} className="border-b border-gray-800 hover:bg-gray-700/50">
                    <td className="p-2 text-center">
                      <button onClick={() => printReturnReceipt(ret)} className="bg-sky-600 text-white px-2 py-1 rounded text-xs">🖨️</button>
                    </td>
                    <td className={`p-2 text-center font-bold ${ret.refundAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {ret.refundAmount.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-bold text-red-400">{ret.total.toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ret.type === 'return' ? 'bg-red-600' : 'bg-orange-600'}`}>
                        {ret.type === 'return' ? '↩️ إرجاع' : '🔄 تبديل'}
                      </span>
                    </td>
                    <td className="p-2 text-center">{ret.client}</td>
                    <td className="p-2 text-center text-yellow-400">{ret.invoiceId}</td>
                    <td className="p-2 text-center text-xs">{ret.date}</td>
                    <td className="p-2 text-center text-sky-400 font-bold">{ret.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {returns.length === 0 && (
            <p className="text-gray-500 text-center py-12 text-lg">لا توجد عمليات إرجاع أو تبديل بعد</p>
          )}
        </div>
      )}
    </div>
  );
}
