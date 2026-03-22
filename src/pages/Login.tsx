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
  const [storeName, setStoreName] = useState('Bakhcha Pro Supermarket');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadSettings();
    return () => clearInterval(timer);
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    if (settings && settings.storeName) {
      setStoreName(settings.storeName);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const user = await loginUser(username.trim(), password);
      if (user) {
        onLogin(user);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بقاعدة البيانات');
      setLoading(false);
    }
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
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-8 text-center border-b border-gray-700/50">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 transform hover:rotate-6 transition-transform">
              <span className="text-5xl">🏪</span>
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 to-orange-500">
              Bakhcha Pro
            </h1>
            <p className="text-gray-400 text-sm mt-1">{storeName}</p>
            <p className="text-gray-500 text-xs mt-1">نظام إدارة السحابي (Supabase)</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-5">
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">👤 اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-800/80 text-white border-2 border-gray-600/50 rounded-xl px-4 py-3 text-lg focus:border-blue-500 transition-all outline-none"
                placeholder="أدخل اسم المستخدم"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2">🔒 كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-gray-800/80 text-white border-2 border-gray-600/50 rounded-xl px-4 py-3 text-lg focus:border-blue-500 transition-all outline-none"
                  placeholder="أدخل كلمة المرور"
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
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-center">
                <p className="text-red-400 text-sm font-bold">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                  : 'bg-gradient-to-l from-green-600 to-emerald-600 hover:scale-[1.02] text-white shadow-green-500/30'
              }`}
            >
              {loading ? 'جاري التحقق...' : '🚀 تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
