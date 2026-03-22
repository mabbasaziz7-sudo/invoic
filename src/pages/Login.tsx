import { useState, useEffect } from 'react';
import { User } from '../types';
import { loginUser, getSettings } from '../store';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const settings = getSettings();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    setTimeout(() => {
      const user = loginUser(username.trim(), password);
      if (user) {
        onLogin(user);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
      }
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27] via-[#1a1a3e] to-[#0f1a2e]">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #e94560 0%, transparent 50%), radial-gradient(circle at 75% 75%, #0f3460 0%, transparent 50%)',
        }} />
        {/* Animated circles */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-green-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Time display */}
        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm">
            {currentTime.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-white text-2xl font-bold font-mono">
            {currentTime.toLocaleTimeString('ar-DZ')}
          </p>
        </div>

        <div className="bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 sm:p-8 text-center border-b border-gray-700/50">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 transform hover:rotate-6 transition-transform">
              <span className="text-4xl sm:text-5xl">🏪</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 to-orange-500">
              Bakhcha Pro
            </h1>
            <p className="text-gray-400 text-sm mt-1">{settings.storeName}</p>
            <p className="text-gray-500 text-xs mt-1">نظام إدارة المبيعات والمخزون</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">
                <span className="ml-1">👤</span> اسم المستخدم
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-800/80 text-white border-2 border-gray-600/50 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none placeholder-gray-500"
                  placeholder="أدخل اسم المستخدم"
                  autoFocus
                  autoComplete="username"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔑</span>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">
                <span className="ml-1">🔒</span> كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-800/80 text-white border-2 border-gray-600/50 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none placeholder-gray-500"
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-xl"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center animate-pulse">
                <p className="text-red-400 text-sm font-bold">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                  : 'bg-gradient-to-l from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-500/30 hover:shadow-green-500/50 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                '🚀 تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-6 sm:px-8 pb-6 text-center">
            <div className="border-t border-gray-700/50 pt-4">
              <p className="text-gray-600 text-xs">
                نظام Bakhcha Pro © {new Date().getFullYear()} - جميع الحقوق محفوظة
              </p>
            </div>
          </div>
        </div>

        {/* Quick hints */}
        <div className="mt-4 text-center">
          <p className="text-gray-600 text-xs">
            حسابات تجريبية: admin/admin | cashier1/1234 | supervisor/1234
          </p>
        </div>
      </div>
    </div>
  );
}
