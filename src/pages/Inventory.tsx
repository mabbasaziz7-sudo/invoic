import { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProducts, getSettings } from '../store';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [prods, sett] = await Promise.all([
      getProducts(),
      getSettings()
    ]);
    setProducts(prods);
    setSettings(sett);
    setIsLoading(false);
  };

  const filtered = products.filter(p => !search || p.name.includes(search) || p.barcode.includes(search));

  const totalItems = products.length;
  const capitalValue = products.reduce((s, p) => s + (p.buyPrice || 0) * (p.quantity || 0), 0);

  if (isLoading) return <div className="p-10 text-center text-sky-400">جاري تحميل المخزون...</div>;

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">📦 إدارة المخزون السحابي</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <p className="text-xs text-gray-400">إجمالي الأصناف</p>
           <p className="text-xl font-bold">{totalItems}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
           <p className="text-xs text-gray-400">رأس مال المخزون</p>
           <p className="text-xl font-bold text-yellow-400">{capitalValue.toFixed(2)} دج</p>
        </div>
      </div>

      <input type="text" placeholder="بحث في المنتجات..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-800 border-gray-700 rounded-lg px-4 py-2 mb-6" />

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-900 border-b border-gray-700 text-gray-400">
            <tr>
              <th className="p-4">المنتج</th>
              <th className="p-4 text-center">الباركود</th>
              <th className="p-4 text-center">الكمية</th>
              <th className="p-4 text-center">سعر الشراء</th>
              <th className="p-4 text-center">سعر البيع</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-gray-700/50">
                 <td className="p-4 font-bold">{p.name}</td>
                 <td className="p-4 text-center font-mono opacity-60 text-xs">{p.barcode}</td>
                 <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${p.quantity <= p.minStock ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{p.quantity}</span>
                 </td>
                 <td className="p-4 text-center">{p.buyPrice}</td>
                 <td className="p-4 text-center text-sky-400 font-bold">{p.sellPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
