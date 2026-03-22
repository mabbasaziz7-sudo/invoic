import { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProducts, getSettings } from '../store';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const settings = getSettings();

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const today = new Date();

  const getExpiryStatus = (p: Product) => {
    if (!p.expiryDate) return 'ok';
    const exp = new Date(p.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'expired';
    if (diff <= 30) return 'soon';
    return 'ok';
  };

  const getDaysLeft = (p: Product) => {
    if (!p.expiryDate) return '-';
    const exp = new Date(p.expiryDate);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStockStatus = (p: Product) => {
    if (p.quantity <= 0) return 'نفذ';
    if (p.quantity <= p.minStock) return 'منخفض';
    return 'متوفر';
  };

  const getExpiryLabel = (p: Product) => {
    const status = getExpiryStatus(p);
    if (status === 'expired') return 'منتهي الصلاحية';
    if (status === 'soon') return `ينتهي قريباً (${getDaysLeft(p)} يوم)`;
    return 'لا يوجد';
  };

  const getRowColor = (p: Product) => {
    const es = getExpiryStatus(p);
    if (es === 'expired') return 'bg-red-900/50 text-red-200';
    if (es === 'soon') return 'bg-orange-900/50 text-orange-200';
    if (p.quantity <= p.minStock) return 'bg-yellow-900/30';
    return '';
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.barcode.includes(search);
    let matchTab = true;
    if (filterTab === 'low') matchTab = p.quantity <= p.minStock;
    if (filterTab === 'expired') matchTab = getExpiryStatus(p) === 'expired';
    if (filterTab === 'soon') matchTab = getExpiryStatus(p) === 'soon';
    return matchSearch && matchTab;
  });

  const totalItems = products.length;
  const lowStock = products.filter(p => p.quantity <= p.minStock).length;
  const capitalValue = products.reduce((s, p) => s + p.buyPrice * p.quantity, 0);
  const expectedSales = products.reduce((s, p) => s + p.sellPrice * p.quantity, 0);
  const expectedProfit = expectedSales - capitalValue;

  const stats = {
    ok: products.filter(p => getExpiryStatus(p) === 'ok' && p.quantity > p.minStock).length,
    soon: products.filter(p => getExpiryStatus(p) === 'soon').length,
    expired: products.filter(p => getExpiryStatus(p) === 'expired').length,
  };

  const printInventory = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><title>جرد المخزون</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;}
      table{width:100%;border-collapse:collapse;margin:20px 0;}
      th,td{border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;}
      th{background:#333;color:white;}
      h2{text-align:center;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
      .logo{width:80px;height:80px;object-fit:contain;}</style></head><body>
      <div class="header"><div><h2 style="margin:0;">${settings.storeName}</h2><p>هاتف: ${settings.phone}</p><p>${settings.address}</p>${settings.taxNumber ? `<p style="font-size:11px;color:#666;">السجل التجاري: ${settings.taxNumber}</p>` : ''}</div>${settings.logo && settings.showLogoOnInvoice !== false ? `<img class="logo" src="${settings.logo}" alt="logo" onerror="this.style.display='none'" />` : ''}</div>
      <h3 style="text-align:center;">جرد المخزون</h3>
      <table>
      <tr><th>ID</th><th>الاسم</th><th>الباركود</th><th>الكمية</th><th>حالة المخزون</th><th>تاريخ الانتهاء</th><th>حالة الصلاحية</th></tr>
      ${filtered.map(p => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.barcode}</td><td>${p.quantity}</td><td>${getStockStatus(p)}</td><td>${p.expiryDate || '-'}</td><td>${getExpiryLabel(p)}</td></tr>`).join('')}
      </table>
      <p><strong>إجمالي الأصناف:</strong> ${totalItems} | <strong>رأس المال:</strong> ${capitalValue.toLocaleString()} ${settings.currency}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-4">لوحة إحصائيات وإدارة المخزون</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="bg-gradient-to-b from-indigo-800 to-indigo-900 rounded-xl p-3 text-center border border-indigo-600">
          <p className="text-gray-300 text-xs mb-1">إجمالي الأصناف</p>
          <p className="text-white text-2xl font-black">{totalItems}</p>
        </div>
        <div className="bg-gradient-to-b from-red-800 to-red-900 rounded-xl p-3 text-center border border-red-600">
          <p className="text-gray-300 text-xs mb-1">نواقص المخزون</p>
          <p className="text-white text-2xl font-black">{lowStock}</p>
        </div>
        <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-xl p-3 text-center border border-purple-600">
          <p className="text-gray-300 text-xs mb-1">رأس مال المخازن (شراء)</p>
          <p className="text-white text-lg font-black">{capitalValue.toLocaleString()} {settings.currency}</p>
        </div>
        <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-xl p-3 text-center border border-green-600">
          <p className="text-gray-300 text-xs mb-1">المبيعات المتوقعة</p>
          <p className="text-white text-lg font-black">{expectedSales.toLocaleString()} {settings.currency}</p>
        </div>
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl p-3 text-center border border-gray-500">
          <p className="text-gray-300 text-xs mb-1">الربح المتوقع</p>
          <p className="text-white text-lg font-black">{expectedProfit.toLocaleString()} {settings.currency}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في المخزون..."
          className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-2" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <button onClick={() => setFilterTab('all')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>الكل (المنتجات)</button>
        <button onClick={() => setFilterTab('low')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterTab === 'low' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}`}>نواقص المخزون (تحت التنبيه)</button>
        <button onClick={() => setFilterTab('soon')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterTab === 'soon' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}>قاربت على الانتهاء</button>
        <button onClick={() => setFilterTab('expired')} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${filterTab === 'expired' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>منتهية الصلاحية</button>
        <div className="mr-auto">
          <button onClick={printInventory} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm">طباعة جرد المخزون 🖨️</button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <span className="bg-green-800 text-green-300 px-3 py-1 rounded-lg text-sm">✅ الصالحة: {stats.ok}</span>
        <span className="bg-orange-800 text-orange-300 px-3 py-1 rounded-lg text-sm">⚠️ قريبة: {stats.soon}</span>
        <span className="bg-red-800 text-red-300 px-3 py-1 rounded-lg text-sm">❌ منتهية: {stats.expired}</span>
        <span className="text-sky-400 font-bold text-sm">الإجمالي: {totalItems}</span>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2">الأيام المتبقية</th>
              <th className="p-2">حالة الصلاحية</th>
              <th className="p-2">تاريخ الانتهاء</th>
              <th className="p-2">حالة المخزون</th>
              <th className="p-2">الكمية المتبقية</th>
              <th className="p-2">الباركود</th>
              <th className="p-2">الاسم</th>
              <th className="p-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-700/50 ${getRowColor(p)}`}>
                <td className="p-2 text-center text-xs">{typeof getDaysLeft(p) === 'number' ? `${getDaysLeft(p)} يوم` : '-'}</td>
                <td className="p-2 text-center text-xs">{getExpiryLabel(p)}</td>
                <td className="p-2 text-center text-xs">{p.expiryDate || '-'}</td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    getStockStatus(p) === 'متوفر' ? 'bg-green-700 text-green-200' :
                    getStockStatus(p) === 'منخفض' ? 'bg-yellow-700 text-yellow-200' :
                    'bg-red-700 text-red-200'
                  }`}>{getStockStatus(p)}</span>
                </td>
                <td className="p-2 text-center font-bold">{p.quantity}</td>
                <td className="p-2 text-center text-xs">{p.barcode ? (p.barcode.length > 10 ? '...' + p.barcode.slice(-7) : p.barcode) : ''}</td>
                <td className="p-2 text-right font-bold">{p.name}</td>
                <td className="p-2 text-center">{p.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
