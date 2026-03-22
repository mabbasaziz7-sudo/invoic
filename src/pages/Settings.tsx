import { useState, useEffect, useRef } from 'react';
import { getSettings, saveSettings, getProducts } from '../store';

export default function Settings() {
  const [settings, setSettingsState] = useState<any>({});
  const [categories, setCategoriesState] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const [sett, prods] = await Promise.all([
      getSettings(),
      getProducts()
    ]);
    setSettingsState(sett);
    
    // Extract categories from products
    const cats = ['الكل', ...new Set(prods.map(p => p.category))];
    setCategoriesState(cats);
    setIsLoading(false);
  };

  const handleSave = async () => {
    const { error } = await saveSettings(settings);
    if (error) {
      alert('خطأ في الحفظ: ' + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1000000) {
      alert('حجم الصورة كبير جداً! الحد الأقصى 1MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettingsState({ ...settings, logo: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) return <div className="p-10 text-center text-sky-400">جاري تحميل الإعدادات من Supabase...</div>;

  return (
    <div className="p-4 h-screen overflow-auto bg-[#1a1c2e] text-white" dir="rtl">
      <h1 className="text-2xl font-bold text-center text-sky-400 mb-6">⚙️ إعدادات النظام (Supabase)</h1>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Store Logo */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">🏪 شعار المتجر</h3>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
             <div className="w-40 h-40 bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-dashed border-gray-600 cursor-pointer"
               onClick={() => logoInputRef.current?.click()}>
               {settings.logo ? (
                 <img src={settings.logo} className="w-full h-full object-contain p-2" />
               ) : (
                 <span className="text-5xl">🏪</span>
               )}
             </div>
             <div className="flex-1 space-y-3">
               <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
               <button onClick={() => logoInputRef.current?.click()} className="bg-sky-600 px-4 py-2 rounded-lg font-bold">📁 تغيير الشعار</button>
             </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4">📋 معلومات المتجر</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">اسم المتجر</label>
              <input type="text" value={settings.storeName || ''} onChange={(e) => setSettingsState({...settings, storeName: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">الهاتف</label>
              <input type="text" value={settings.phone || ''} onChange={(e) => setSettingsState({...settings, phone: e.target.value})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">الضريبة الافتراضية (%)</label>
              <input type="number" value={settings.defaultTax || 0} onChange={(e) => setSettingsState({...settings, defaultTax: Number(e.target.value)})} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${saved ? 'bg-green-600' : 'bg-sky-600 shadow-lg shadow-sky-900/40'}`}>
          {saved ? '✅ تم الحفظ في قاعدة البيانات!' : '💾 حفظ الإعدادات سحابياً'}
        </button>

        {/* Categories (View Only in this simplified settings) */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
           <h3 className="text-lg font-bold text-white mb-4">📁 التصنيفات الحالية</h3>
           <div className="flex flex-wrap gap-2">
              {categories.map(c => <span key={c} className="bg-gray-700 px-3 py-1 rounded-full text-sm">{c}</span>)}
           </div>
        </div>
      </div>
    </div>
  );
}
