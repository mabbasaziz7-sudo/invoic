import { useState, useEffect } from 'react';
import { Client } from '../types';
import { getClients, saveClient, supabase } from '../store';

export default function ClientDebts() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', debt: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getClients();
    setClients(data);
    setIsLoading(false);
  };

  const onSave = async () => {
    if (!form.name) return;
    const clientData = { ...form, id: editClient?.id };
    const { error } = await saveClient(clientData as any);
    if (error) {
      alert('خطأ في الحفظ: ' + error.message);
    } else {
      await loadData();
      setShowAddModal(false);
    }
  };

  const deleteClient = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) alert('خطأ في الحذف: ' + error.message);
    else await loadData();
  };

  const filtered = clients.filter(c => !search || c.name.includes(search) || (c.phone && c.phone.includes(search)));

  if (isLoading) return <div className="p-10 text-center text-sky-400">جاري تحميل الديون...</div>;

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">💰 ديون العملاء (Supabase)</h1>
      
      <div className="flex gap-4 mb-6 flex-wrap">
         <button onClick={() => { setEditClient(null); setForm({ name: '', phone: '', debt: 0 }); setShowAddModal(true); }} className="bg-green-600 px-6 py-2 rounded-xl font-bold">+ إضافة عميل</button>
         <input type="text" placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-gray-800 border-gray-700 rounded-lg px-4 py-2" />
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-900 border-b border-gray-700 text-gray-400">
            <tr>
              <th className="p-4">الاسم</th>
              <th className="p-4 text-center">الهاتف</th>
              <th className="p-4 text-center">الدين الحالي</th>
              <th className="p-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-700/50">
                 <td className="p-4 font-bold">{c.name}</td>
                 <td className="p-4 text-center opacity-70">{c.phone || '-'}</td>
                 <td className="p-4 text-center">
                    <span className={`font-black text-lg ${c.debt > 0 ? 'text-red-400' : 'text-green-400'}`}>{c.debt} دج</span>
                 </td>
                 <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                       <button onClick={() => { setEditClient(c); setForm({ name: c.name, phone: c.phone || '', debt: c.debt }); setShowAddModal(true); }} className="bg-blue-600 px-3 py-1 rounded text-xs">تعديل</button>
                       <button onClick={() => deleteClient(c.id)} className="bg-red-600 px-2 py-1 rounded text-xs">🗑️</button>
                    </div>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
           <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-600 shadow-2xl">
              <h3 className="text-xl font-bold text-sky-400 mb-4">{editClient ? 'تعديل بيانات عميل' : 'إضافة عميل'}</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="الاسم" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                 <input type="text" placeholder="الهاتف" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                 <input type="number" placeholder="الدين" value={form.debt} onChange={e => setForm({...form, debt: Number(e.target.value)})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                 <div className="flex gap-2">
                    <button onClick={onSave} className="flex-1 bg-green-600 py-2 rounded-xl font-bold text-white">حفظ</button>
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-600 py-2 rounded-xl text-white">إلغاء</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
