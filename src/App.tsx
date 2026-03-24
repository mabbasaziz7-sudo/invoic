import { useState, useEffect } from 'react';
import { PageType, User } from './types';
import { getCurrentUser, getUserPermissions, logoutUser } from './store';
import Sidebar from './components/Sidebar';
import Calculator from './components/Calculator';
import Login from './pages/Login';
import POS from './pages/POS';
import Products from './pages/Products';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import Statistics from './pages/Statistics';
import InvoiceLog from './pages/InvoiceLog';
import ClientDebts from './pages/ClientDebts';
import Settings from './pages/Settings';
import Returns from './pages/Returns';
import CustomerDisplay from './pages/CustomerDisplay';
import Promotions from './pages/Promotions';
import DailyClosing from './pages/DailyClosing';
import ShiftMonitor from './pages/ShiftMonitor';
import ProfitReport from './pages/Profit';
import Clients from './pages/Clients';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('pos');
  const [showCalculator, setShowCalculator] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('display') === 'customer') {
      setCurrentPage('customer-display');
      setIsLoggedIn(true);
      setCheckingAuth(false);
      return;
    }

    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    // Navigate to first allowed page
    const perms = getUserPermissions(user);
    if (perms.pos) setCurrentPage('pos');
    else if (perms.products) setCurrentPage('products');
    else if (perms.invoices) setCurrentPage('invoices');
    else if (perms.dailyClosing) setCurrentPage('daily-closing');
    else setCurrentPage('pos');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentPage('pos');
  };

  // Check page permissions
  const handleSetPage = (page: PageType) => {
    if (!currentUser) {
      setCurrentPage(page);
      return;
    }
    const perms = getUserPermissions(currentUser);
    const pagePermMap: Partial<Record<PageType, keyof typeof perms>> = {
      'pos': 'pos',
      'products': 'products',
      'users': 'users',
      'inventory': 'inventory',
      'statistics': 'statistics',
      'debts': 'debts',
      'invoices': 'invoices',
      'returns': 'returns',
      'settings': 'settings',
      'customer-display': 'customerDisplay',
      'promotions': 'promotions',
      'daily-closing': 'dailyClosing',
      'shift-monitor': 'shiftMonitor',
      'clients': 'debts',
    };
    const permKey = pagePermMap[page];
    if (permKey && !perms[permKey]) {
      alert('🚫 ليس لديك صلاحية للوصول إلى هذه الصفحة');
      return;
    }
    setCurrentPage(page);
  };

  // Loading
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sky-400 font-bold">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Customer display full screen
  if (currentPage === 'customer-display') {
    return (
      <div dir="rtl">
        <CustomerDisplay />
        <button
          onClick={() => handleSetPage('pos')}
          className="fixed bottom-4 left-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-sm z-50 opacity-30 hover:opacity-100 transition-all"
        >
          ← العودة للنظام
        </button>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'pos': return <POS currentUser={currentUser} />;
      case 'products': return <Products currentUser={currentUser} />;
      case 'users': return <Users />;
      case 'inventory': return <Inventory />;
      case 'statistics': return <Statistics />;
      case 'invoices': return <InvoiceLog />;
      case 'debts': return <ClientDebts />;
      case 'settings': return <Settings />;
      case 'returns': return <Returns />;
      case 'promotions': return <Promotions />;
      case 'daily-closing': return <DailyClosing />;
      case 'shift-monitor': return <ShiftMonitor currentUser={currentUser} />;
      case 'profit': return <ProfitReport />;
      case 'clients': return <Clients />;
      default: return <POS currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#1a1a2e]" dir="rtl">
      <Sidebar
        currentPage={currentPage}
        setPage={handleSetPage}
        onCalculator={() => setShowCalculator(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content - responsive margin */}
      <div className="flex-1 md:mr-40 lg:mr-56 overflow-hidden">
        {renderPage()}
      </div>

      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
}

export default App;
