import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Invoice, Expense } from '../types';
import { getInvoices, getExpenses, saveExpense, getSettings, getCurrentUser } from '../store';

export default function Statistics() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseLog, setShowExpenseLog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: '', category: 'فواتير (كهرباء، ماء، غاز)', description: '', amount: 0 });
  const settings = getSettings();
  // products available

  useEffect(() => {
    const load = async () => {
      setInvoices(await getInvoices());
      setExpenses(await getExpenses());
    };
    load();
  }, []);

  const today = new Date();
  const filterDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (filterPeriod) {
      case 'today': return date.toDateString() === today.toDateString();
      case 'week': { const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7); return date >= weekAgo; }
      case 'month': return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      case 'year': return date.getFullYear() === today.getFullYear();
      default: return true;
    }
  };

  const filteredInvoices = invoices.filter(inv => filterDate(inv.date));
  const filteredExpenses = expenses.filter(exp => filterDate(exp.date));

  const totalRevenue = filteredInvoices.reduce((s, i) => s + i.total, 0);
  const totalProfit = filteredInvoices.reduce((s, i) => s + i.profit, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalProfit - totalExpenses;

  // Sales chart data (by day)
  const salesByDay: Record<string, number> = {};
  filteredInvoices.forEach(inv => {
    const day = inv.date.slice(-2);
    salesByDay[day] = (salesByDay[day] || 0) + inv.total;
  });
  const chartData = Object.entries(salesByDay).map(([day, amount]) => ({ day, amount: Math.round(amount) })).sort((a, b) => Number(a.day) - Number(b.day));

  // Top products
  const productSales: Record<string, number> = {};
  filteredInvoices.forEach(inv => {
    inv.items.forEach(item => {
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });
  });
  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  // Best performing products
  const productRevenue: Record<string, { revenue: number; qty: number }> = {};
  filteredInvoices.forEach(inv => {
    inv.items.forEach(item => {
      if (!productRevenue[item.name]) productRevenue[item.name] = { revenue: 0, qty: 0 };
      productRevenue[item.name].revenue += item.total;
      productRevenue[item.name].qty += item.quantity;
    });
  });
  const bestProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const addExpenseItem = async () => {
    if (!expenseForm.description || !expenseForm.amount) { alert('أكمل البيانات'); return; }
    const newExpense: Expense = {
      id: 0, // Supabase assigns ID
      date: expenseForm.date || new Date().toISOString(),
      category: expenseForm.category,
      description: expenseForm.description,
      amount: expenseForm.amount,
    };
    await saveExpense(newExpense);
    setExpenses(await getExpenses());
    setExpenseForm({ date: '', category: 'فواتير (كهرباء، ماء، غاز)', description: '', amount: 0 });
    setShowExpenseModal(false);
  };

  const printExpenses = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl"><head><title>سجل المصروفات</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;}
      table{width:100%;border-collapse:collapse;margin:20px 0;}
      th,td{border:1px solid #ddd;padding:8px;text-align:center;}
      th{background:#333;color:white;}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
      .logo{width:80px;height:80px;object-fit:contain;}</style></head><body>
      <div class="header"><div><h2 style="margin:0;">${settings.storeName}</h2><p>هاتف: ${settings.phone}</p><p>${settings.address}</p>${settings.taxNumber ? `<p style="font-size:11px;color:#666;">السجل التجاري: ${settings.taxNumber}</p>` : ''}</div>${settings.logo && settings.showLogoOnInvoice !== false ? `<img class="logo" src="${settings.logo}" alt="logo" onerror="this.style.display='none'" />` : ''}</div>
      <h3 style="text-align:center;">سجل المصروفات التشغيلية</h3>
      <table><tr><th>التاريخ</th><th>التصنيف</th><th>الوصف</th><th>المبلغ</th></tr>
      ${filteredExpenses.map(e => `<tr><td>${e.date}</td><td>${e.category}</td><td>${e.description}</td><td>${e.amount.toFixed(2)}</td></tr>`).join('')}
      </table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printFullReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html dir="rtl">
        <head>
          <title>تقرير النشاط التجاري - ${filterPeriod}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .stat-grid { display: grid; grid-cols: 2; gap: 20px; margin-bottom: 30px; }
            .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 10px; text-align: center; }
            .label { font-size: 14px; color: #666; margin-bottom: 5px; }
            .value { font-size: 20px; font-weight: bold; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
            th { background: #f4f4f4; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <h1>${settings.storeName}</h1>
            <h2>تقرير الأداء والإحصائيات الشاملّة</h2>
            <p>الفترة: ${filterPeriod === 'all' ? 'كامل الفترة' : filterPeriod} | تاريخ التقرير: ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="display: flex; gap: 15px; margin-bottom: 30px;">
             <div class="stat-box" style="flex: 1;">
                <div class="label">إجمالي المبيعات</div>
                <div class="value">${totalRevenue.toFixed(2)} ${settings.currency}</div>
             </div>
             <div class="stat-box" style="flex: 1;">
                <div class="label">إجمالي المصروفات</div>
                <div class="value">${totalExpenses.toFixed(2)} ${settings.currency}</div>
             </div>
             <div class="stat-box" style="flex: 1; background: #f0fff0;">
                <div class="label">صافي الأرباح</div>
                <div class="value" style="color: green;">${netProfit.toFixed(2)} ${settings.currency}</div>
             </div>
          </div>

          <h3>🔝 المنتجات الأكثر مبيعاً</h3>
          <table>
             <thead><tr><th>#</th><th>المنتج</th><th>الكمية المباعة</th></tr></thead>
             <tbody>
               ${topProducts.map((p, i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${p.qty}</td></tr>`).join('')}
             </tbody>
          </table>

          <div class="footer">
            <p>نظام Bakhcha Pro POS - تم الاستخراج بواسطة: ${getCurrentUser()?.fullName || 'مسؤول'}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const expenseCategories = ['فواتير (كهرباء، ماء، غاز)', 'إيجار', 'رواتب', 'صيانة', 'نقل وشحن', 'أخرى'];

  return (
    <div className="p-4 h-screen overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-sky-400">📊 لوحة تحكم الأرباح والإحصائيات</h1>
        <button onClick={printFullReport} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all">
          🖨️ طباعة تقرير شامل
        </button>
      </div>

      {/* Filter Period */}
      <div className="flex gap-0 mb-4 bg-gray-800 rounded-xl overflow-hidden w-fit">
        {[
          { id: 'today', label: 'اليوم' },
          { id: 'week', label: 'هذا الأسبوع' },
          { id: 'month', label: 'هذا الشهر' },
          { id: 'year', label: 'هذه السنة' },
          { id: 'all', label: 'الكل' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilterPeriod(f.id)}
            className={`px-5 py-2 text-sm font-bold transition-all ${filterPeriod === f.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-b from-green-700 to-green-900 rounded-xl p-4 text-center border border-green-500">
          <p className="text-green-200 text-xs mb-1">الإيرادات (المبيعات)</p>
          <p className="text-white text-xl font-black">{totalRevenue.toLocaleString()} {settings.currency}</p>
        </div>
        <div className="bg-gradient-to-b from-blue-700 to-blue-900 rounded-xl p-4 text-center border border-blue-500">
          <p className="text-blue-200 text-xs mb-1">الربح العام (السلعي)</p>
          <p className="text-white text-xl font-black">{totalProfit.toLocaleString()} {settings.currency}</p>
        </div>
        <div className="bg-gradient-to-b from-red-700 to-red-900 rounded-xl p-4 text-center border border-red-500">
          <p className="text-red-200 text-xs mb-1">المصروفات (الخسائر)</p>
          <p className="text-white text-xl font-black">{totalExpenses.toLocaleString()} {settings.currency}</p>
        </div>
        <div className="bg-gradient-to-b from-yellow-700 to-yellow-900 rounded-xl p-4 text-center border border-yellow-500">
          <p className="text-yellow-200 text-xs mb-1">الربح الصافي النهائي</p>
          <p className="text-white text-xl font-black">{netProfit.toLocaleString()} {settings.currency}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Sales Chart */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-center text-gray-400 mb-3 font-bold">تطور المبيعات (أيام)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-center text-gray-400 mb-3 font-bold">الأكثر مبيعاً (كمية)</h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-900 rounded-lg p-2">
                <span className="text-yellow-400 font-bold w-6">{i + 1}</span>
                <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-lg">📦</div>
                <span className="text-white flex-1 text-sm">{p.name}</span>
                <span className="text-green-400 font-bold">{p.qty}</span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-gray-500 text-center py-8">لا توجد بيانات</p>}
          </div>
        </div>
      </div>

      {/* Best Performance Table & Top Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-center text-gray-400 mb-3 font-bold">أفضل أداء للسلع:</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">المنتج</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {bestProducts.map(([name, data], i) => (
                  <tr key={i} className="border-b border-gray-700">
                    <td className="p-2 text-center">{i + 1}</td>
                    <td className="p-2 text-right">{name}</td>
                    <td className="p-2 text-center">{data.qty}</td>
                    <td className="p-2 text-center font-bold">{data.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-center text-gray-400 mb-3 font-bold">أفضل العملاء (إنفاقاً):</h3>
          <div className="overflow-auto">
            {(() => {
              const clientSpending: Record<string, number> = {};
              filteredInvoices.forEach(inv => {
                clientSpending[inv.client] = (clientSpending[inv.client] || 0) + inv.total;
              });
              const topClients = Object.entries(clientSpending)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
              
              return (
                <table className="w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">العميل</th>
                      <th className="p-2">إجمالي المشتريات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map(([name, total], i) => (
                      <tr key={i} className="border-b border-gray-700">
                        <td className="p-2 text-center">{i + 1}</td>
                        <td className="p-2 text-right">{name}</td>
                        <td className="p-2 text-center font-bold text-sky-400">{total.toLocaleString()} {settings.currency}</td>
                      </tr>
                    ))}
                    {topClients.length === 0 && (
                      <tr><td colSpan={3} className="p-4 text-center text-gray-500">لا توجد بيانات</td></tr>
                    )}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Expense Buttons */}
      <div className="flex gap-3 mt-4">
        <button onClick={() => setShowExpenseModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold transition-all">
          ➖ إضافة مصروف
        </button>
        <button onClick={() => setShowExpenseLog(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-xl font-bold transition-all">
          📋 سجل المصروفات
        </button>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[450px] shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-red-400 mb-4 text-center">إضافة مصروف جديد</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">التاريخ</label>
                <input type="datetime-local" value={expenseForm.date} onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">التصنيف</label>
                <select value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الوصف</label>
                <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">المبلغ (دج)</label>
                <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
            <button onClick={addExpenseItem} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl font-bold">تسجيل المصاريف</button>
              <button onClick={() => setShowExpenseModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Log Modal */}
      {showExpenseLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowExpenseLog(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[700px] max-h-[80vh] overflow-auto shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setShowExpenseLog(false)} className="text-red-400 hover:text-red-300 text-xl">✕</button>
              <h3 className="text-xl font-bold text-orange-400">📋 تفاصيل المصروفات التشغيلية</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">التصنيف</th>
                  <th className="p-2">الوصف</th>
                  <th className="p-2">المبلغ (دج)</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, i) => (
                  <tr key={e.id} className="border-b border-gray-700">
                    <td className="p-2 text-center">{i + 1}</td>
                    <td className="p-2 text-center text-xs">{e.date}</td>
                    <td className="p-2 text-center text-xs">{e.category}</td>
                    <td className="p-2 text-right">{e.description}</td>
                    <td className="p-2 text-center text-red-400 font-bold">{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredExpenses.length === 0 && <p className="text-gray-500 text-center py-8">لا توجد مصروفات</p>}
            <button onClick={printExpenses} className="w-full mt-4 bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-xl font-bold">طباعة السجل 🖨️</button>
          </div>
        </div>
      )}
    </div>
  );
}
