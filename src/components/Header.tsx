import { useEffect, useRef, useState } from 'react';
import { Globe, RotateCcw, ChevronDown, ExternalLink, Map, Package, Settings2, Menu, X, Check } from 'lucide-react';
import type { Language } from '../types';
import { assetUrl } from '../utils/assets';
import { OFFICIAL_DOCS } from '../data/sources';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onReset: () => void;
  onOpenRegionModal: () => void;
  onOpenItemsModal: () => void;
  onOpenModeModal: () => void;
}

const TEXT = {
  title: {
    en: 'EdgeOne Pricing Calculator',
    zh: 'EdgeOne 价格计算器',
    kr: 'EdgeOne 가격 계산기',
    jp: 'EdgeOne 料金計算ツール',
    id: 'Kalkulator Harga EdgeOne',
  },
  subtitle: { en: 'Internal Quote Tool', zh: '内部报价工具', kr: '내부 견적 도구', jp: '社内見積りツール', id: 'Alat Estimasi Internal' },
  reset: { en: 'Clear draft', zh: '清空草稿', kr: '초안 비우기', jp: '下書きをクリア', id: 'Kosongkan draf' },
  console: { en: 'Console', zh: '控制台', kr: '콘솔', jp: 'コンソール', id: 'Konsol' },
  region: { en: 'Regions', zh: '区域', kr: '지역', jp: '地域', id: 'Wilayah' },
  pricing: { en: 'Official pricing', zh: '官方价格', kr: '공식 가격', jp: '公式料金', id: 'Harga resmi' },
  items: { en: 'Items', zh: '项目', kr: '항목', jp: '項目', id: 'Item' },
  mode: { en: 'Mode', zh: '模式', kr: '모드', jp: 'モード', id: 'Mode' },
  menu: { en: 'Menu', zh: '菜单', kr: '메뉴', jp: 'メニュー', id: 'Menu' },
  language: { en: 'Language', zh: '语言', kr: '언어', jp: '言語', id: 'Bahasa' },
} as const;

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  zh: '中文',
  kr: '한국어',
  jp: '日本語',
  id: 'Bahasa Indonesia',
};

const LANGUAGES = Object.keys(LANGUAGE_LABELS) as Language[];

const BTN =
  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-700 hover:bg-gray-50 transition-colors text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

export function Header({ language, onLanguageChange, onReset, onOpenRegionModal, onOpenItemsModal, onOpenModeModal }: HeaderProps) {
  const t = (k: keyof typeof TEXT) => TEXT[k][language];
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close the language menu on outside click / Escape.
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLangOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  const infoActions = [
    { key: 'items', icon: Package, label: t('items'), onClick: onOpenItemsModal },
    { key: 'mode', icon: Settings2, label: t('mode'), onClick: onOpenModeModal },
    { key: 'region', icon: Map, label: t('region'), onClick: onOpenRegionModal },
  ];
  const links = [
    { key: 'pricing', label: t('pricing'), href: OFFICIAL_DOCS.pricingPage },
    { key: 'console', label: t('console'), href: 'https://console.tencentcloud.com/edgeone' },
  ];

  const closeMobile = (fn: () => void) => () => {
    setMobileOpen(false);
    fn();
  };

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm z-30 relative">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={assetUrl('t.svg')} alt="" className="w-8 h-8 object-contain shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">{t('title')}</h1>
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{t('subtitle')}</span>
            </div>
          </div>

          {/* Desktop */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {infoActions.map(({ key, icon: Icon, label, onClick }) => (
              <button key={key} type="button" onClick={onClick} className={BTN}>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
            {links.map(({ key, label, href }) => (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={BTN}>
                <ExternalLink className="w-4 h-4" />
                <span>{label}</span>
              </a>
            ))}

            <div className="w-px h-6 bg-gray-200 mx-2" />

            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={t('language')}
                className={BTN}
              >
                <Globe className="w-4 h-4" />
                <span>{LANGUAGE_LABELS[language]}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <ul
                  role="listbox"
                  aria-label={t('language')}
                  className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-xl py-1 z-50"
                >
                  {LANGUAGES.map((lang) => (
                    <li key={lang}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={language === lang}
                        onClick={() => {
                          onLanguageChange(lang);
                          setLangOpen(false);
                        }}
                        className={`flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          language === lang ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        {LANGUAGE_LABELS[lang]}
                        {language === lang && <Check className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button type="button" onClick={onReset} className={`${BTN} hover:!text-red-600 hover:!bg-red-50`}>
              <RotateCcw className="w-4 h-4" />
              <span>{t('reset')}</span>
            </button>
          </nav>

          {/* Mobile / tablet */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={t('menu')}
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div id="mobile-menu" className="lg:hidden mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-1">
            {infoActions.map(({ key, icon: Icon, label, onClick }) => (
              <button key={key} type="button" onClick={closeMobile(onClick)} className={BTN}>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
            {links.map(({ key, label, href }) => (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={BTN}>
                <ExternalLink className="w-4 h-4" />
                <span>{label}</span>
              </a>
            ))}
            <label className="col-span-2 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700">
              <Globe className="w-4 h-4 shrink-0" />
              <span className="sr-only">{t('language')}</span>
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={closeMobile(onReset)} className={`${BTN} col-span-2 text-red-600`}>
              <RotateCcw className="w-4 h-4" />
              <span>{t('reset')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
