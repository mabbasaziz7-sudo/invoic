import { useState, useEffect } from 'react';
import { User, UserPermissions, defaultPermissions } from '../types';
import { getUsers, saveUser, deleteUserFromDB } from '../store';

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
  const [form, setForm] = useState({
    username: '', password: '', role: 'كاشير',
    fullName: '', phone: '', active: true,
    permissions: { ...defaultPermissions['كاشير'] },
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      setUsers(await getUsers());
    };
    load();
  }, []);

  const openAdd = () => {
    setForm({
      username: '', password: '', role: 'كاشير',
      fullName: '', phone: '', active: true,
      permissions: { ...defaultPermissions['كاشير'] },
    });
    setEditUser(null);
    setShowPermissions(false);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setForm({
      username: u.username, password: u.password, role: u.role,
      fullName: u.fullName || '', phone: u.phone || '', active: u.active !== false,
      permissions: u.permissions ? { ...u.permissions } : { ...defaultPermissions[u.role || 'كاشير'] },
    });
    setEditUser(u);
    setShowPermissions(false);
    setShowModal(true);
  };

  const handleRoleChange = (role: string) => {
    const perms = defaultPermissions[role as keyof typeof defaultPermissions] || defaultPermissions['كاشير'];
    setForm({ ...form, role, permissions: { ...perms } });
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setForm({
      ...form,
      permissions: { ...form.permissions, [key]: !form.permissions[key] },
    });
  };

  const handleSaveUser = async () => {
    if (!form.username || !form.password) { alert('أكمل البيانات المطلوبة'); return; }
    const existingUser = users.find(u => u.username === form.username && u.id !== editUser?.id);
    if (existingUser) { alert('اسم المستخدم موجود بالفعل'); return; }

    const userData: Partial<User> = {
      username: form.username,
      password: form.password,
      role: form.role,
      fullName: form.fullName,
      phone: form.phone,
      active: form.active,
      permissions: form.permissions,
    };

    if (editUser) {
      userData.id = editUser.id;
    }

    await saveUser(userData);
    setUsers(await getUsers());
    setShowModal(false);
  };

  const toggleActive = async (user: User) => {
    const updatedUser = { ...user, active: user.active === false ? true : false };
    await saveUser(updatedUser);
    setUsers(await getUsers());
  };

  const handleDeleteUser = async (id: number) => {
    const u = users.find(x => x.id === id);
    if (u?.role === 'مدير' && users.filter(x => x.role === 'مدير').length <= 1) {
      alert('لا يمكن حذف آخر مدير في النظام');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await deleteUserFromDB(id);
    setUsers(await getUsers());
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'مدير': return 'bg-red-600';
      case 'مشرف': return 'bg-purple-600';
      case 'كاشير': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'مدير': return '👑';
      case 'مشرف': return '🛡️';
      case 'كاشير': return '💳';
      default: return '👤';
    }
  };

  const permGroups = ['الصفحات', 'العمليات', 'المعلومات'];

  return (
    <div className="p-3 sm:p-4 lg:p-6 h-screen overflow-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-center text-sky-400 mb-4 sm:mb-6">👥 إدارة المستخدمين والصلاحيات</h1>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
        <button onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base shadow-lg hover:shadow-green-500/30 transition-all">
          ➕ إضافة مستخدم جديد
        </button>
        <input
          type="text"
          placeholder="🔍 بحث عن مستخدم..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-2.5 text-sm"
        />
        <div className="flex gap-2 items-center text-sm text-gray-400">
          <span className="bg-gray-800 px-3 py-1.5 rounded-lg">الإجمالي: {users.length}</span>
          <span className="bg-green-800/50 px-3 py-1.5 rounded-lg text-green-400">نشط: {users.filter(u => u.active !== false).length}</span>
          <span className="bg-red-800/50 px-3 py-1.5 rounded-lg text-red-400">معطل: {users.filter(u => u.active === false).length}</span>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredUsers.map(u => (
          <div key={u.id} className={`bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-4 border transition-all hover:shadow-lg ${u.active === false ? 'border-red-600/50 opacity-60' : 'border-gray-700 hover:border-sky-500/50'}`}>
            {/* User Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${getRoleColor(u.role)} rounded-full flex items-center justify-center text-2xl sm:text-3xl shadow-lg relative`}>
                {getRoleIcon(u.role)}
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-800 ${u.active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base sm:text-lg truncate">{u.fullName || u.username}</p>
                <p className="text-gray-400 text-xs">@{u.username}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${getRoleColor(u.role)} text-white`}>
                  {getRoleIcon(u.role)} {u.role}
                </span>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-1.5 mb-3 text-xs sm:text-sm">
              {u.phone && (
                <div className="flex items-center gap-2 text-gray-400">
                  <span>📱</span> <span>{u.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <span>🔐</span> <span>كلمة المرور: {'•'.repeat(u.password.length)}</span>
              </div>
            </div>

            {/* Permission Summary */}
            <div className="bg-gray-800/50 rounded-lg p-2 mb-3">
              <p className="text-[10px] text-gray-500 mb-1">الصلاحيات:</p>
              <div className="flex flex-wrap gap-1">
                {(u.permissions ? Object.entries(u.permissions) : Object.entries(defaultPermissions[u.role as keyof typeof defaultPermissions] || defaultPermissions['كاشير']))
                  .filter(([, v]) => v)
                  .slice(0, 6)
                  .map(([k]) => {
                    const perm = permissionLabels.find(p => p.key === k);
                    return perm ? (
                      <span key={k} className="text-[10px] bg-sky-700/50 text-sky-300 px-1.5 py-0.5 rounded">{perm.icon}</span>
                    ) : null;
                  })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => openEdit(u)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-all">✏️ تعديل</button>
              <button onClick={() => toggleActive(u)} className={`flex-1 ${u.active !== false ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white py-2 rounded-lg text-xs font-bold transition-all`}>
                {u.active !== false ? '🚫 تعطيل' : '✅ تفعيل'}
              </button>
              <button onClick={() => handleDeleteUser(u.id)} className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-all">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3" onClick={() => setShowModal(false)}>
          <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-600 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-600/20 to-purple-600/20 p-4 sm:p-6 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold text-sky-400">
                  {editUser ? '✏️ تعديل المستخدم' : '➕ إضافة مستخدم جديد'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">👤 اسم المستخدم <span className="text-red-500">*</span></label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">🔒 كلمة المرور <span className="text-red-500">*</span></label>
                  <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">📝 الاسم الكامل</label>
                  <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">📱 رقم الهاتف</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:border-sky-500 outline-none" />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">🎭 الدور / الصلاحية</label>
                  <select value={form.role} onChange={e => handleRoleChange(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:border-sky-500 outline-none">
                    <option value="مدير">👑 مدير - صلاحيات كاملة</option>
                    <option value="مشرف">🛡️ مشرف - صلاحيات متوسطة</option>
                    <option value="كاشير">💳 كاشير - صلاحيات محدودة</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">الحالة</label>
                  <div className="flex gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={form.active} onChange={() => setForm({ ...form, active: true })} className="accent-green-500 w-4 h-4" />
                      <span className="text-green-400 text-sm font-bold">✅ نشط</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={!form.active} onChange={() => setForm({ ...form, active: false })} className="accent-red-500 w-4 h-4" />
                      <span className="text-red-400 text-sm font-bold">🚫 معطل</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Permissions Toggle */}
              <div>
                <button
                  onClick={() => setShowPermissions(!showPermissions)}
                  className="w-full bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/50 hover:to-blue-600/50 border border-purple-500/30 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>🔐</span>
                  <span>تخصيص الصلاحيات</span>
                  <span className="text-lg">{showPermissions ? '▲' : '▼'}</span>
                </button>
              </div>

              {/* Permissions Grid */}
              {showPermissions && (
                <div className="bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-700 space-y-4">
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => {
                      const allTrue: Record<string, boolean> = {};
                      permissionLabels.forEach(p => { allTrue[p.key] = true; });
                      setForm({ ...form, permissions: allTrue as unknown as UserPermissions });
                    }} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-bold">✅ تحديد الكل</button>
                    <button onClick={() => {
                      const allFalse: Record<string, boolean> = {};
                      permissionLabels.forEach(p => { allFalse[p.key] = false; });
                      setForm({ ...form, permissions: allFalse as unknown as UserPermissions });
                    }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-bold">❌ إلغاء الكل</button>
                  </div>

                  {permGroups.map(group => (
                    <div key={group}>
                      <h4 className="text-sm font-bold text-sky-400 mb-2 border-b border-gray-700 pb-1">{group}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {permissionLabels.filter(p => p.group === group).map(perm => (
                          <label key={perm.key} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-xs sm:text-sm ${
                            form.permissions[perm.key] ? 'bg-green-700/30 border border-green-500/30' : 'bg-gray-800/50 border border-gray-700'
                          }`}>
                            <input
                              type="checkbox"
                              checked={form.permissions[perm.key]}
                              onChange={() => togglePermission(perm.key)}
                              className="accent-green-500 w-4 h-4"
                            />
                            <span>{perm.icon}</span>
                            <span className="text-gray-300">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveUser} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all shadow-lg">
                  💾 حفظ
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
