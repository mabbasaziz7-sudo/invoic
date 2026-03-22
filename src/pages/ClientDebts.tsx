import { useState, useEffect } from 'react';
import { Client } from '../types';
import { getClients, saveClients, getSettings } from '../store';

export default function ClientDebts() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', debt: 0 });
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payClient, setPayClient] = useState<Client | null>(null);
  const settings = getSettings();

  useEffect(() => {
    setClients(getClients());
  }, []);

  const filtered = clients.filter(c => !search || c.name.includes(search) || c.phone.includes(search));
  const totalDebt = clients.reduce((s, c) => s + c.debt, 0);

  const openAdd = () => {
    setForm({ name: '', phone: '', debt: 0 });
    setEditClient(null);
    setShowAddModal(true);
  };

  const openEdit = (c: Client) => {
    setForm({ name: c.name, phone: c.phone, debt: c.debt });
    setEditClient(c);
    setShowAddModal(true);
  };

  const saveClient = () => {
    if (!form.name) { alert('أدخل اسم العميل'); return; }
    let updated: Client[];
    if (editClient) {
      updated = clients.map(c => c.id === editClient.id ? { ...c, ...form } : c);
    } else {
      const newId = clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1;
      updated = [...clients, { id: newId, ...form }];
    }
    saveClients(updated);
    setClients(updated);
    setShowAddModal(false);
  };

  const deleteClient = (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    const updated = clients.filter(c => c.id !== id);
    saveClients(updated);
    setClients(updated);
  };

  const openPay = (c: Client) => {
    setPayClient(c);
    setPaymentAmount(0);
    setShowPayModal(true);
  };

  const makePayment = () => {
    if (!payClient) return;
    const updated = clients.map(c => {
      if (c.id === payClient.id) {
        return { ...c, debt: Math.max(0, c.debt - paymentAmount) };
      }
      return c;
    });
    saveClients(updated);
    setClients(updated);
    setShowPayModal(false);
  };

  return (
    <div className="p-4 h-screen overflow-auto">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-4">💰 ديون العملاء</h1>

      <div className="flex gap-3 mb-4 flex-wrap">
        <button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold">+ إضافة عميل جديد</button>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 min-w-[200px]" />
      </div>

      <div className="bg-red-800/30 rounded-xl px-4 py-3 mb-4 border border-red-600 text-center">
        <span className="text-red-300 text-lg">إجمالي الديون: </span>
        <span className="text-white text-2xl font-black">{totalDebt.toLocaleString()} {settings.currency}</span>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-3">إجراءات</th>
              <th className="p-3">الدين ({settings.currency})</th>
              <th className="p-3">الهاتف</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-700/50">
                <td className="p-2 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => openPay(c)} className="bg-green-600 text-white px-2 py-1 rounded text-xs">💵 دفع</button>
                    <button onClick={() => openEdit(c)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">✏️</button>
                    <button onClick={() => deleteClient(c.id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs">🗑️</button>
                  </div>
                </td>
                <td className={`p-2 text-center font-bold text-lg ${c.debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {c.debt.toLocaleString()}
                </td>
                <td className="p-2 text-center">{c.phone || '-'}</td>
                <td className="p-2 text-right font-bold">{c.name}</td>
                <td className="p-2 text-center">{c.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[400px] shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-400 mb-4 text-center">{editClient ? 'تعديل العميل' : 'إضافة عميل جديد'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الاسم</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الهاتف</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">الدين الحالي</label>
                <input type="number" value={form.debt} onChange={(e) => setForm({...form, debt: Number(e.target.value)})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveClient} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold">حفظ</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && payClient && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPayModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[400px] shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-green-400 mb-4 text-center">💵 تسديد دين</h3>
            <p className="text-center text-white mb-2">العميل: <strong>{payClient.name}</strong></p>
            <p className="text-center text-red-400 mb-4">الدين الحالي: <strong>{payClient.debt.toLocaleString()} {settings.currency}</strong></p>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">المبلغ المدفوع</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-center text-xl" />
            </div>
            <p className="text-center text-gray-400 mt-2">المتبقي: <span className="text-yellow-400 font-bold">{Math.max(0, payClient.debt - paymentAmount).toLocaleString()} {settings.currency}</span></p>
            <div className="flex gap-3 mt-4">
              <button onClick={makePayment} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold">تأكيد الدفع</button>
              <button onClick={() => setShowPayModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
