import { useState, useEffect } from 'react';
import { Client } from '../types';
import { getClients, saveClient, deleteClient } from '../store';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedClientForPoints, setSelectedClientForPoints] = useState<Client | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', address: '', debt: 0, points: 0 });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setClients(await getClients());
    setLoading(false);
  };

  const filtered = clients.filter(c =>
    !search || c.name.includes(search) || (c.phone || '').includes(search)
  );

  const totalDebt = clients.reduce((s, c) => s + c.debt, 0);
  const totalPoints = clients.reduce((s, c) => s + (c.points || 0), 0);

  const openAdd = () => {
    setForm({ name: '', phone: '', address: '', debt: 0, points: 0 });
    setEditClient(null);
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', debt: c.debt, points: c.points || 0 });
    setEditClient(c);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('أدخل اسم العميل'); return; }
    const data: Partial<Client> = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      debt: Number(form.debt),
      points: Number(form.points),
    };
    if (editClient) data.id = editClient.id;
    await saveClient(data);
    setShowModal(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    await deleteClient(id);
    load();
  };

  const openPointsModal = (c: Client) => {
    setSelectedClientForPoints(c);
    setPointsToAdd(0);
    setShowPointsModal(true);
  };

  const handleAddPoints = async () => {
    if (!selectedClientForPoints) return;
    const newPoints = (selectedClientForPoints.points || 0) + pointsToAdd;
    await saveClient({ ...selectedClientForPoints, points: newPoints });
    setShowPointsModal(false);
    load();
  };

  const handleRedeemPoints = async (c: Client, amount: number) => {
    if ((c.points || 0) < amount) { alert('النقاط غير كافية!'); return; }
    const newPoints = (c.points || 0) - amount;
    await saveClient({ ...c, points: newPoints });
    load();
    alert(`تم استرداد ${amount} نقطة بقيمة ${amount} دج ✅`);
  };

  return (
    <div className="p-4 h-screen overflow-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-yellow-400 mb-4">👥 إدارة العملاء ونقاط الولاء</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-blue-400">{clients.length}</div>
          <div className="text-xs text-gray-400 mt-1">إجمالي العملاء</div>
        </div>
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-red-400">{totalDebt.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">إجمالي الديون</div>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-yellow-400">{totalPoints}</div>
          <div className="text-xs text-gray-400 mt-1">إجمالي النقاط</div>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-green-400">{clients.filter(c => (c.points || 0) > 0).length}</div>
          <div className="text-xs text-gray-400 mt-1">عملاء لديهم نقاط</div>
        </div>
      </div>

      {/* Points System Info */}
      <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🌟</span>
          <span className="font-bold text-yellow-400">نظام نقاط الولاء</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
          <div>✅ <strong>كسب النقاط:</strong> نقطة واحدة لكل 100 دج مشتريات</div>
          <div>🎁 <strong>استرداد النقاط:</strong> كل نقطة = 1 دج خصم</div>
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex gap-2 mb-4">
        <button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all">
          ➕ إضافة عميل
        </button>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف..."
          className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">
          <span className="text-4xl animate-pulse block mb-2">⏳</span>
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-center">الهاتف</th>
                <th className="p-3 text-center">العنوان</th>
                <th className="p-3 text-center">🌟 النقاط</th>
                <th className="p-3 text-center">💸 الدين</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">
                    <span className="text-4xl block mb-2">👥</span>
                    لا يوجد عملاء
                  </td>
                </tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="p-3 font-bold text-white">{c.name}</td>
                  <td className="p-3 text-center text-gray-300 text-xs">{c.phone || '-'}</td>
                  <td className="p-3 text-center text-gray-400 text-xs max-w-[150px] truncate">{c.address || '-'}</td>
                  <td className="p-3 text-center">
                    <span className={`font-bold text-lg ${(c.points || 0) > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {c.points || 0}
                    </span>
                    <div className="text-xs text-gray-500">= {c.points || 0} دج</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${c.debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {c.debt.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center flex-wrap">
                      <button
                        onClick={() => openPointsModal(c)}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs font-bold"
                        title="إضافة نقاط"
                      >
                        🌟 نقاط
                      </button>
                      {(c.points || 0) > 0 && (
                        <button
                          onClick={() => {
                            const amt = parseInt(prompt(`استرداد نقاط (الرصيد الحالي: ${c.points}) - أدخل عدد النقاط:`) || '0');
                            if (amt > 0) handleRedeemPoints(c, amt);
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs font-bold"
                          title="استرداد نقاط"
                        >
                          🔄 استرداد
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(c)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-bold"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[450px] max-h-[90vh] overflow-auto shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">
              {editClient ? '✏️ تعديل بيانات العميل' : '➕ إضافة عميل جديد'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">اسم العميل *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" autoFocus />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">📱 رقم الهاتف</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" dir="ltr" placeholder="0555-00-00-00" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">📍 العنوان</label>
                <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2" placeholder="عنوان العميل..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">🌟 النقاط</label>
                  <input type="number" value={form.points} onChange={e => setForm({...form, points: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-yellow-600/50 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">💸 الدين الحالي</label>
                  <input type="number" value={form.debt} onChange={e => setForm({...form, debt: Number(e.target.value)})}
                    className="w-full bg-gray-800 text-white border border-red-600/50 rounded-lg px-3 py-2" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold">✅ حفظ</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Points Modal */}
      {showPointsModal && selectedClientForPoints && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPointsModal(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[380px] shadow-2xl border border-yellow-500/30" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-yellow-400 mb-2 text-center">🌟 إضافة نقاط</h3>
            <p className="text-center text-gray-300 mb-4">
              العميل: <strong className="text-white">{selectedClientForPoints.name}</strong><br />
              <span className="text-yellow-400 font-bold">الرصيد الحالي: {selectedClientForPoints.points || 0} نقطة</span>
            </p>
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-1 block">عدد النقاط المضافة</label>
              <input
                type="number"
                value={pointsToAdd}
                onChange={e => setPointsToAdd(Number(e.target.value))}
                className="w-full bg-gray-800 text-white border border-yellow-500 rounded-lg px-3 py-3 text-2xl text-center font-bold"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1 text-center">الرصيد الجديد: {(selectedClientForPoints.points || 0) + pointsToAdd} نقطة</p>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-4">
              {[10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => setPointsToAdd(pointsToAdd + n)}
                  className="bg-gray-700 hover:bg-gray-600 text-yellow-400 py-1.5 rounded-lg text-sm font-bold">
                  +{n}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleAddPoints} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black py-2.5 rounded-xl font-bold">✅ إضافة</button>
              <button onClick={() => setShowPointsModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
