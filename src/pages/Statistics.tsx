import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Invoice, Expense } from '../types';
import { getInvoices, getExpenses, saveExpense, getSettings } from '../store';

export default function Statistics() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseLog, setShowExpenseLog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: '', category: 'فواتير (كهرباء، ماء، غاز)', description: '', amount: 0 });
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [invs, exps, sett] = await Promise.all([
      getInvoices(),
      getExpenses(),
      getSettings()
    ]);
    setInvoices(invs);
    setExpenses(exps);
    setSettings(sett);
    setIsLoading(false);
  };

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
  const totalProfit = filteredInvoices.reduce((s, i) => s + (i.profit || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalProfit - totalExpenses;

  // Sales chart data
  const salesByDay: Record<string, number> = {};
  filteredInvoices.forEach(inv => {
    const day = inv.date.slice(8, 10);
    salesByDay[day] = (salesByDay[day] || 0) + inv.total;
  });
  const chartData = Object.entries(salesByDay).map(([day, amount]) => ({ day, amount: Math.round(amount) })).sort((a, b) => Number(a.day) - Number(b.day));

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) return;
    const newExpense = {
      date: expenseForm.date || new Date().toISOString(),
      category: expenseForm.category,
      description: expenseForm.description,
      amount: expenseForm.amount,
    };
    await saveExpense(newExpense);
    await loadData();
    setShowExpenseModal(false);
    setExpenseForm({ date: '', category: 'فواتير (كهرباء، ماء، غاز)', description: '', amount: 0 });
  };

  if (isLoading) return <div className="p-10 text-center text-sky-400">جاري تحميل البيانات من Supabase...</div>;

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">📊 الإحصائيات والأرباح السحابية</h1>

      <div className="flex gap-2 mb-6 justify-center">
        {['today', 'week', 'month', 'year', 'all'].map(p => (
          <button key={p} onClick={() => setFilterPeriod(p)} className={`px-4 py-1.5 rounded-lg text-sm font-bold ${filterPeriod === p ? 'bg-sky-600' : 'bg-gray-800'}`}>
            {p === 'today' ? 'اليوم' : p === 'week' ? 'الأسبوع' : p === 'month' ? 'الشهر' : p === 'year' ? 'السنة' : 'الكل'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-2xl border-b-4 border-green-500 text-center">
           <p className="text-xs text-gray-400 mb-1">الإيرادات</p>
           <p className="text-2xl font-black text-green-400">{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-2xl border-b-4 border-blue-500 text-center">
           <p className="text-xs text-gray-400 mb-1">الربح العام</p>
           <p className="text-2xl font-black text-blue-400">{totalProfit.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-2xl border-b-4 border-red-500 text-center">
           <p className="text-xs text-gray-400 mb-1">المصروفات</p>
           <p className="text-2xl font-black text-red-500">{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-2xl border-b-4 border-yellow-500 text-center shadow-lg shadow-yellow-900/10">
           <p className="text-xs text-gray-400 mb-1">الربح الصافي</p>
           <p className="text-2xl font-black text-yellow-400">{netProfit.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 h-80">
          <h3 className="text-center mb-4 text-gray-400">تطور المبيعات اليومي</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 overflow-auto">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-400">سجل المصروفات</h3>
              <button onClick={() => setShowExpenseModal(true)} className="bg-red-600 px-3 py-1 rounded text-xs font-bold">+ إضافة</button>
           </div>
           <table className="w-full text-sm">
             <thead>
               <tr className="text-gray-500 border-b border-gray-700">
                 <th className="p-2 text-right">الوصف</th>
                 <th className="p-2 text-center">المبلغ</th>
               </tr>
             </thead>
             <tbody>
               {filteredExpenses.map(e => (
                 <tr key={e.id} className="border-b border-gray-700/50">
                    <td className="p-2">{e.description}</td>
                    <td className="p-2 text-center text-red-400 font-bold">{e.amount}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
           <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-600 shadow-2xl">
              <h3 className="text-xl font-bold text-red-400 mb-4">إضافة مصروف</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="الوصف" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                 <input type="number" placeholder="المبلغ" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                 <div className="flex gap-2">
                    <button onClick={handleAddExpense} className="flex-1 bg-red-600 py-2 rounded-xl font-bold text-white">إضافة</button>
                    <button onClick={() => setShowExpenseModal(false)} className="flex-1 bg-gray-600 py-2 rounded-xl text-white">إلغاء</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
