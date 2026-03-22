import { useState, useEffect } from 'react';
import { User, UserPermissions, defaultPermissions } from '../types';
import { getUsers, saveUser, supabase } from '../store';

const permissionLabels: { key: keyof UserPermissions; label: string; icon: string; group: string }[] = [
  { key: 'pos', label: 'نقطة البيع', icon: '🛒', group: 'الصفحات' },
  { key: 'products', label: 'صفحة المنتجات', icon: '📦', group: 'الصفحات' },
  { key: 'inventory', label: 'إدارة المخزون', icon: '📋', group: 'الصفحات' },
  { key: 'statistics', label: 'الإحصاءات', icon: '📊', group: 'الصفحات' },
  { key: 'debts', label: 'ديون العملاء', icon: '💰', group: 'الصفحات' },
  { key: 'invoices', label: 'سجل الفواتير', icon: '🧾', group: 'الصفحات' },
  { key: 'returns', label: 'المرتجعات', icon: '🔄', group: 'الصفحات' },
  { key: 'users', label: 'إدارة المستخدمين', icon: '👥', group: 'الصفحات' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️', group: 'الصفحات' },
  { key: 'customerDisplay', label: 'شاشة العميل', icon: '📺', group: 'الصفحات' },
  { key: 'addProduct', label: 'إضافة منتج', icon: '➕', group: 'العمليات' },
  { key: 'editProduct', label: 'تعديل منتج', icon: '✏️', group: 'العمليات' },
  { key: 'deleteProduct', label: 'حذف منتج', icon: '🗑️', group: 'العمليات' },
  { key: 'viewBuyPrice', label: 'عرض سعر الشراء', icon: '💲', group: 'المعلومات' },
  { key: 'viewProfit', label: 'عرض الأرباح', icon: '📈', group: 'المعلومات' },
  { key: 'giveDiscount', label: 'منح خصم', icon: '🏷️', group: 'العمليات' },
  { key: 'editPrices', label: 'تعديل الأسعار', icon: '💵', group: 'العمليات' },
];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    username: '', password: '', role: 'كاشير',
    fullName: '', phone: '', active: true,
    permissions: { ...defaultPermissions['كاشير'] },
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const openAdd = () => {
    setForm({
      username: '', password: '', role: 'كاشير',
      fullName: '', phone: '', active: true,
      permissions: { ...defaultPermissions['كاشير'] },
    });
    setEditUser(null);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setForm({
      username: u.username, password: u.password, role: u.role,
      fullName: u.fullName || '', phone: u.phone || '', active: u.active !== false,
      permissions: u.permissions ? { ...u.permissions } : { ...defaultPermissions[u.role] || defaultPermissions['كاشير'] },
    });
    setEditUser(u);
    setShowModal(true);
  };

  const onSave = async () => {
    if (!form.username || !form.password) return;
    const userData = { ...form, id: editUser?.id };
    const { error } = await saveUser(userData as any);
    if (error) {
      alert('خطأ في الحفظ: ' + error.message);
    } else {
      await loadData();
      setShowModal(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) alert('خطأ في الحذف: ' + error.message);
    else await loadData();
  };

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">👥 إدارة المستخدمين (Supabase)</h1>

      <button onClick={openAdd} className="bg-green-600 px-6 py-2 rounded-xl font-bold mb-6">+ إضافة مستخدم</button>

      {isLoading ? (
        <div className="text-center py-10 animate-pulse text-sky-400">جاري تحميل المستخدمين...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-lg">{u.fullName || u.username}</p>
                    <p className="text-xs text-gray-400">@{u.username} • {u.role}</p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${u.active !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => openEdit(u)} className="flex-1 bg-blue-600 py-1.5 rounded-lg text-sm font-bold">تعديل</button>
                  <button onClick={() => deleteUser(u.id)} className="bg-red-600 py-1.5 px-3 rounded-lg text-sm">🗑️</button>
               </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-600 shadow-2xl">
             <h3 className="text-xl font-bold text-sky-400 mb-4">{editUser ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h3>
             <div className="space-y-4">
                <input type="text" placeholder="اسم المستخدم" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                <input type="password" placeholder="كلمة المرور" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                <input type="text" placeholder="الاسم الكامل" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2">
                   <option value="مدير">مدير</option>
                   <option value="مشرف">مشرف</option>
                   <option value="كاشير">كاشير</option>
                </select>
                <div className="flex gap-3 mt-6">
                  <button onClick={onSave} className="flex-1 bg-green-600 py-2 rounded-xl font-bold">حفظ</button>
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-600 py-2 rounded-xl font-bold">إلغاء</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
