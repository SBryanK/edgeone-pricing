import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Footer } from './Footer';

interface LoginPageProps {
  onLogin: () => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

// Password MUST be configured at build/deploy time via VITE_APP_PASSWORD.
// No default is shipped, so an unconfigured deploy will reject every login
// attempt — this is intentional: without an explicit password, the only way
// to get in is to contact the maintainer.
// NOTE: This is client-side gating only; not a real security boundary. For
// real auth, put this app behind SSO / an authenticating reverse proxy.
const PASSWORD: string = (import.meta.env.VITE_APP_PASSWORD as string | undefined) || '';

// Contact details shown on the login page when users don't know the password.
const CONTACT_HANDLE = 'sbryankusno';
const CONTACT_EMAIL = 'sbryankusno@global.tencent.com';

export function LoginPage({ onLogin, language }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    title: {
      en: 'EdgeOne Pricing Calculator',
      zh: 'EdgeOne 价格计算器',
      kr: 'EdgeOne 가격 계산기',
      jp: 'EdgeOne 料金計算ツール',
      id: 'Kalkulator Harga EdgeOne',
    }[language],
    subtitle: {
      en: 'Internal Quote Tool',
      zh: '内部报价工具',
      kr: '내부 견적 도구',
      jp: '社内見積りツール',
      id: 'Alat Estimasi Internal',
    }[language],
    passwordLabel: {
      en: 'Password',
      zh: '密码',
      kr: '비밀번호',
      jp: 'パスワード',
      id: 'Kata Sandi',
    }[language],
    login: {
      en: 'Login',
      zh: '登录',
      kr: '로그인',
      jp: '로그인',
      id: 'Masuk',
    }[language],
    contactIntro: {
      en: "Don't have the password? Contact",
      zh: '没有密码？请联系',
      kr: '비밀번호가 없으신가요? 문의:',
      jp: 'パスワードがわからない場合は、お問い合わせください：',
      id: 'Belum punya kata sandi? Hubungi',
    }[language],
    contactOr: {
      en: 'or email',
      zh: '或邮件至',
      kr: '또는 이메일:',
      jp: 'またはメール：',
      id: 'atau email ke',
    }[language],
    error: {
      en: 'Incorrect password',
      zh: '密码错误',
      kr: '잘못된 비밀번호',
      jp: 'パスワードが正しくありません',
      id: 'Kata sandi salah',
    }[language],
    showPassword: {
      en: 'Show password',
      zh: '显示密码',
      kr: '비밀번호 표시',
      jp: 'パスワードを表示',
      id: 'Tampilkan kata sandi',
    }[language],
    hidePassword: {
      en: 'Hide password',
      zh: '隐藏密码',
      kr: '비밀번호 숨기기',
      jp: 'パスワードを隠す',
      id: 'Sembunyikan kata sandi',
    }[language],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reject empty passwords outright so an unconfigured deploy can't be
    // bypassed by just pressing Enter.
    if (PASSWORD && password === PASSWORD) {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm border border-gray-100">
            <img
              src="/t.svg"
              alt="EdgeOne"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">{t.subtitle}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`w-full pl-4 pr-12 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${
                  error
                    ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
                autoFocus
                autoComplete="current-password"
                // Hint to password managers that this is a sensitive field
                // while still letting the user toggle visibility manually.
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                aria-pressed={showPassword}
                title={showPassword ? t.hidePassword : t.showPassword}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-blue-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={2} />
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs font-medium text-red-500">{t.error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
          >
            {t.login}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500 font-medium leading-relaxed">
          {t.contactIntro}{' '}
          <span className="font-bold text-blue-600">{CONTACT_HANDLE}</span>
          <br />
          {t.contactOr}{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-bold text-blue-600 hover:underline break-all"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
        </div>
      </div>
      <Footer language={language} />
    </div>
  );
}
