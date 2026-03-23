import { useState, useEffect } from 'react';
import { PageType, User, UserPermissions, Product } from '../types';
import { getUserPermissions, getSettings, getProducts } from '../store';

interface SidebarProps {
  currentPage: PageType;
  setPage: (page: PageType) => void;
  onCalculator: () => void;
  currentUser: User | null;
  onLogout: () => void;
}

const menuItems: { id: PageType; label: string; shortLabel: string; emoji: string; color: string; permKey: keyof UserPermissions | null }[] = [
  { id: 'pos', label: 'نقطة البيع', shortLabel: 'البيع', emoji: '🛒', color: 'bg-green-600 hover:bg-green-700', permKey: 'pos' },
  { id: 'products', label: 'المنتجات', shortLabel: 'المنتجات', emoji: '📦', color: 'bg-sky-500 hover:bg-sky-600', permKey: 'products' },
  { id: 'promotions', label: 'العروض والكوبونات', shortLabel: 'العروض', emoji: '🎟️', color: 'bg-pink-600 hover:bg-pink-700', permKey: 'promotions' },
  // { id: 'daily-closing', label: 'تقفيل اليوم', shortLabel: 'تقفيل', emoji: '🏁', color: 'bg-gray-600 hover:bg-gray-700', permKey: 'dailyClosing' },

  { id: 'users', label: 'المستخدمين', shortLabel: 'المستخدمين', emoji: '👥', color: 'bg-sky-500 hover:bg-sky-600', permKey: 'users' },
  { id: 'inventory', label: 'المخزون والجرد', shortLabel: 'الجرد', emoji: '📊', color: 'bg-indigo-500 hover:bg-indigo-600', permKey: 'inventory' },
  { id: 'statistics', label: 'الإحصاءات', shortLabel: 'الإحصاءات', emoji: '📊', color: 'bg-sky-500 hover:bg-sky-600', permKey: 'statistics' },
  { id: 'debts', label: 'ديون العملاء', shortLabel: 'الديون', emoji: '💰', color: 'bg-sky-500 hover:bg-sky-600', permKey: 'debts' },
  { id: 'invoices', label: 'سجل الفواتير', shortLabel: 'الفواتير', emoji: '🧾', color: 'bg-sky-500 hover:bg-sky-600', permKey: 'invoices' },
  { id: 'profit', label: 'الأرباح', shortLabel: 'الأرباح', emoji: '📈', color: 'bg-green-700 hover:bg-green-800', permKey: 'viewProfit' },
  { id: 'returns', label: 'المرتجعات', shortLabel: 'المرتجعات', emoji: '🔄', color: 'bg-orange-500 hover:bg-orange-600', permKey: 'returns' },
  { id: 'customer-display', label: 'شاشة العميل', shortLabel: 'العميل', emoji: '📺', color: 'bg-purple-500 hover:bg-purple-600', permKey: 'customerDisplay' },
  { id: 'settings', label: 'إعدادات النظام', shortLabel: 'الإعدادات', emoji: '⚙️', color: 'bg-sky-500 hover:bg-sky-600', permKey: 'settings' },
  // { id: 'shift-monitor', label: 'مراقبة الكاشير', shortLabel: 'مراقبة', emoji: '🖥️', color: 'bg-indigo-600 hover:bg-indigo-700', permKey: 'shiftMonitor' },

];

export default function Sidebar({ currentPage, setPage, onCalculator, currentUser, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPriceSearch, setShowPriceSearch] = useState(false);
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceSearchResults, setPriceSearchResults] = useState<Product[]>([]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Listen to fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    // Check initial state
    handleFullscreenChange();
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = () => {
    const el = document.documentElement as any;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) {
      rfs.call(el).then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fallback: open maximized window
        const w = window.open(window.location.href, '_blank', 
          `width=${screen.availWidth},height=${screen.availHeight},top=0,left=0,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`);
        if (w) {
          w.moveTo(0, 0);
          w.resizeTo(screen.availWidth, screen.availHeight);
        }
      });
    } else {
      // Fallback: open maximized window
      const w = window.open(window.location.href, '_blank', 
        `width=${screen.availWidth},height=${screen.availHeight},top=0,left=0,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`);
      if (w) {
        w.moveTo(0, 0);
        w.resizeTo(screen.availWidth, screen.availHeight);
      }
    }
  };

  const exitFullscreen = () => {
    const doc = document as any;
    const efs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
    if (efs) {
      efs.call(doc).catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleFullscreen = () => {
    const doc = document as any;
    const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
    if (isFull) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  const perms = currentUser ? getUserPermissions(currentUser) : null;

  const visibleItems = menuItems.filter(item => {
    if (!perms) return true;
    if (!item.permKey) return true;
    return perms[item.permKey];
  });

  const handlePageClick = (page: PageType) => {
    setPage(page);
    if (isMobile) setMobileOpen(false);
  };

  const handleLogout = () => {
    onLogout();
  };

  const handlePriceSearch = async (query: string) => {
    setPriceSearchQuery(query);
    if (query.trim().length === 0) {
      setPriceSearchResults([]);
      return;
    }
    const products = await getProducts();
    const results = products.filter((p: Product) => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      (p.barcode && p.barcode.includes(query))
    );
    setPriceSearchResults(results);
  };

  const settings = getSettings();

  const sidebarContent = (
    <>
      {settings.logo && (
        <div className="mb-1">
          <img 
            src={settings.logo} 
            alt="logo" 
            className="w-12 h-12 lg:w-14 lg:h-14 object-contain mx-auto drop-shadow-lg rounded-xl"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="text-xl sm:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 to-orange-500 mb-1 lg:mb-2 tracking-wide text-center">
        Bakhcha Pro
      </div>

      {/* Current User Info */}
      {currentUser && (
        <div className="w-full px-1.5 lg:px-2 mb-1 lg:mb-2">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-1.5 lg:p-2 border border-gray-700 text-center">
            <div className="flex items-center justify-center gap-1 lg:gap-2">
              <span className="text-sm lg:text-lg">
                {currentUser.role === 'مدير' ? '👑' : currentUser.role === 'مشرف' ? '🛡️' : '💳'}
              </span>
              <span className="text-white font-bold text-[10px] sm:text-xs lg:text-sm truncate">
                {currentUser.fullName || currentUser.username}
              </span>
            </div>
            <span className={`text-[9px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded-full inline-block mt-0.5 lg:mt-1 ${
              currentUser.role === 'مدير' ? 'bg-red-600' : currentUser.role === 'مشرف' ? 'bg-purple-600' : 'bg-blue-600'
            } text-white`}>
              {currentUser.role}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 w-full overflow-y-auto px-1.5 lg:px-2 space-y-1 lg:space-y-1.5 pb-1 lg:pb-2">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePageClick(item.id)}
            className={`w-full py-1.5 lg:py-2 px-2 lg:px-3 rounded-xl text-white font-bold text-[10px] sm:text-xs lg:text-sm flex items-center justify-center gap-1 lg:gap-2 transition-all duration-200 shadow-lg ${
              currentPage === item.id
                ? 'bg-green-600 ring-2 ring-yellow-400 scale-105'
                : item.color
            }`}
          >
            <span className="truncate hidden sm:inline">{item.label}</span>
            <span className="truncate sm:hidden">{item.shortLabel}</span>
            <span className="text-sm lg:text-base flex-shrink-0">{item.emoji}</span>
          </button>
        ))}
      </div>

      <div className="w-full px-1.5 lg:px-2 space-y-1 lg:space-y-1.5 mt-auto pt-1 lg:pt-2 pb-1 lg:pb-2">
        {/* Price Search Button */}
        <button
          onClick={() => { setShowPriceSearch(true); setPriceSearchQuery(''); setPriceSearchResults([]); }}
          className="w-full py-1.5 lg:py-2 px-2 lg:px-3 rounded-xl text-white font-bold text-[10px] sm:text-xs lg:text-sm flex items-center justify-center gap-1 lg:gap-2 bg-teal-600 hover:bg-teal-700 transition-all duration-200 shadow-lg"
        >
          <span>بحث عن سعر</span>
          <span>🔍</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="w-full py-1.5 lg:py-2 px-2 lg:px-3 rounded-xl text-white font-bold text-[10px] sm:text-xs lg:text-sm flex items-center justify-center gap-1 lg:gap-2 bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 shadow-lg"
        >
          <span>{isFullscreen ? 'تصغير الشاشة' : 'شاشة كاملة'}</span>
          <span>{isFullscreen ? '🔲' : '🖥️'}</span>
        </button>

        <button
          onClick={() => { onCalculator(); if (isMobile) setMobileOpen(false); }}
          className="w-full py-1.5 lg:py-2 px-2 lg:px-3 rounded-xl text-gray-900 font-bold text-[10px] sm:text-xs lg:text-sm flex items-center justify-center gap-1 lg:gap-2 bg-amber-400 hover:bg-amber-500 transition-all duration-200 shadow-lg"
        >
          <span>آلة حاسبة</span>
          <span>⌨️</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full py-1.5 lg:py-2 px-2 lg:px-3 rounded-xl text-white font-bold text-[10px] sm:text-xs lg:text-sm flex items-center justify-center gap-1 lg:gap-2 bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-lg"
        >
          <span>تسجيل الخروج</span>
          <span>🚪</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="fixed top-2 right-2 z-[60] bg-gradient-to-br from-yellow-500 to-orange-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-xl hover:scale-110 transition-all"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-[49]" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile
          ? `fixed top-0 right-0 z-[55] w-48 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`
          : 'w-40 lg:w-56 fixed right-0 top-0 z-50'
        }
        min-h-screen bg-gradient-to-b from-[#0f1a2e] to-[#1a1a2e] flex flex-col items-center py-2 lg:py-3 border-l border-gray-700 overflow-y-auto
      `} style={{ height: '100vh' }}>
        {sidebarContent}
      </div>

      {/* Price Search Modal */}
      {showPriceSearch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-2" onClick={() => setShowPriceSearch(false)}>
          <div className="bg-[#1e293b] rounded-2xl p-4 lg:p-6 w-full max-w-[500px] max-h-[80vh] shadow-2xl border border-gray-600" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-teal-400">🔍 بحث عن سعر سلعة</h3>
              <button onClick={() => setShowPriceSearch(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <input
              type="text"
              value={priceSearchQuery}
              onChange={(e) => handlePriceSearch(e.target.value)}
              placeholder="اكتب اسم المنتج أو الباركود..."
              className="w-full bg-gray-800 text-white border-2 border-teal-500 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-teal-400"
              autoFocus
            />

            <div className="overflow-auto max-h-[50vh] space-y-2">
              {priceSearchQuery.trim().length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <span className="text-4xl block mb-2">🔍</span>
                  <p>اكتب اسم المنتج أو رقم الباركود للبحث</p>
                </div>
              )}
              
              {priceSearchQuery.trim().length > 0 && priceSearchResults.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <span className="text-4xl block mb-2">❌</span>
                  <p>لا توجد نتائج لـ "{priceSearchQuery}"</p>
                </div>
              )}

              {priceSearchResults.map((product) => (
                <div key={product.id} className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 hover:border-teal-500 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">{product.name}</div>
                      <div className="flex gap-3 mt-1">
                        {product.barcode && (
                          <span className="text-gray-400 text-xs">باركود: {product.barcode}</span>
                        )}
                        <span className="text-gray-400 text-xs">التصنيف: {product.category}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-yellow-400 font-black text-xl">{product.sellPrice}</div>
                      <div className={`text-xs font-bold ${product.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        المخزون: {product.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
