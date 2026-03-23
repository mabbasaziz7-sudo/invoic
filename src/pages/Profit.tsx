import { useState, useEffect } from 'react';
import { getInvoices, getSettings } from '../store';
import { Invoice } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function ProfitReport() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const settings = getSettings();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitData = () => {
    const dailyProfit: Record<string, number> = {};
    const productProfit: Record<string, number> = {};

    invoices.forEach(inv => {
      const date = inv.date.split('T')[0];
      dailyProfit[date] = (dailyProfit[date] || 0) + (inv.profit || 0);

      inv.items.forEach(item => {
        productProfit[item.name] = (productProfit[item.name] || 0) + ((inv.profit / inv.total) * item.total || 0);
      });
    });

    const chartData = Object.entries(dailyProfit)
      .map(([date, profit]) => ({ date, profit }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);

    const pieData = Object.entries(productProfit)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { chartData, pieData };
  };

  const { chartData, pieData } = calculateProfitData();
  const totalProfit = invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
  const avgProfitMargin = invoices.length > 0 
    ? (totalProfit / invoices.reduce((sum, inv) => sum + inv.total, 0)) * 100 
    : 0;

  if (loading) return <div className="p-10 text-center text-gray-500">جاري تحميل تقرير الأرباح...</div>;

  return (
    <div className="p-4 space-y-6 h-screen overflow-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-green-400 font-arabic">📈 تقرير الأرباح والنمو</h1>
        <div className="bg-green-900/20 px-4 py-2 rounded-xl border border-green-500/30">
          <span className="text-gray-400 text-xs ml-2">إجمالي الأرباح:</span>
          <span className="text-xl font-black text-green-400">{totalProfit.toFixed(2)} {settings.currency}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs mb-1">صافي الربح التراكمي</p>
          <p className="text-3xl font-black text-white">{totalProfit.toFixed(2)}</p>
          <p className="text-[10px] text-green-400 mt-2">↑ نسب نمو مستقرة</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs mb-1">متوسط هامش الربح</p>
          <p className="text-3xl font-black text-sky-400">{avgProfitMargin.toFixed(1)}%</p>
          <p className="text-[10px] text-gray-500 mt-2">مقارنة بسعر التكلفة</p>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700 shadow-xl">
          <p className="text-gray-400 text-xs mb-1">عدد العمليات المربحة</p>
          <p className="text-3xl font-black text-purple-400">{invoices.length}</p>
          <p className="text-[10px] text-gray-500 mt-2">إجمالي فواتير النظام</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700 shadow-xl h-[400px]">
          <h3 className="text-gray-200 font-bold mb-6">منحنى الأرباح اليومي (آخر 7 أيام)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }}
                itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
              />
              <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-3xl border border-gray-700 shadow-xl h-[400px]">
          <h3 className="text-gray-200 font-bold mb-6">المنتجات الأكثر ربحية</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-3xl border border-gray-700 overflow-hidden shadow-xl">
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <h3 className="font-bold text-gray-200 text-right">أحدث العمليات وأرباحها</h3>
        </div>
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-900/50 text-gray-400">
            <tr>
              <th className="p-4">الفاتورة</th>
              <th className="p-4">التاريخ</th>
              <th className="p-4">الكاشير</th>
              <th className="p-4">المبيعات</th>
              <th className="p-4 text-green-400">الربح الصافي</th>
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 10).map(inv => (
              <tr key={inv.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                <td className="p-4 font-mono text-xs">{inv.id}</td>
                <td className="p-4 text-gray-400">{new Date(inv.date).toLocaleDateString('ar-EG')}</td>
                <td className="p-4 font-bold">{inv.cashier}</td>
                <td className="p-4">{inv.total.toFixed(2)}</td>
                <td className="p-4 text-green-400 font-black">+{inv.profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
