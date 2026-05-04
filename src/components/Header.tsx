import { Globe, RotateCcw, ChevronDown, ExternalLink, Map, Package, Settings2 } from 'lucide-react';

interface HeaderProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  onLanguageChange: (lang: 'en' | 'zh' | 'kr' | 'jp' | 'id') => void;
  onReset: () => void;
  onOpenRegionModal: () => void;
  onOpenItemsModal: () => void;
  onOpenModeModal: () => void;
}

export function Header({ language, onLanguageChange, onReset, onOpenRegionModal, onOpenItemsModal, onOpenModeModal }: HeaderProps) {

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
    reset: {
      en: 'Reset',
      zh: '重置',
      kr: '초기화',
      jp: 'リセット',
      id: 'Setel Ulang',
    }[language],
    console: {
      en: 'Console',
      zh: '控制台',
      kr: '콘솔',
      jp: 'コンソール',
      id: 'Konsol',
    }[language],
    region: {
      en: 'Regions',
      zh: '区域',
      kr: '지역',
      jp: '地域',
      id: 'Wilayah',
    }[language],
    site: {
      en: 'Site',
      zh: '站点',
      kr: '사이트',
      jp: 'サイト',
      id: 'Situs',
    }[language],
    items: {
      en: 'Items',
      zh: '项目',
      kr: '항목',
      jp: '項目',
      id: 'Item',
    }[language],
    mode: {
      en: 'Mode',
      zh: '模式',
      kr: '모드',
      jp: 'モード',
      id: 'Mode',
    }[language],
  };

  const languageLabels = {
    en: 'English',
    zh: '中文',
    kr: '한국어',
    jp: '日本語',
    id: 'Bahasa Indonesia',
  };

  return (
    <header className="bg-white border-b border-gray-100 text-gray-3000 shadow-sm z-30 transition-colors">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
              <img
                src="/t.svg"
                alt="EdgeOne"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-1500 leading-tight">{t.title}</h1>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t.subtitle}</span>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Items button */}
            <button
              onClick={onOpenItemsModal}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 hover:text-blue-700 transition-all text-sm font-semibold backdrop-blur-sm"
            >
              <Package className="w-4 h-4" />
              <span>{t.items}</span>
            </button>

            {/* Mode button */}
            <button
              onClick={onOpenModeModal}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 hover:text-blue-700 transition-all text-sm font-semibold backdrop-blur-sm"
            >
              <Settings2 className="w-4 h-4" />
              <span>{t.mode}</span>
            </button>

            {/* Region button */}
            <button
              onClick={onOpenRegionModal}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 hover:text-blue-700 transition-all text-sm font-semibold backdrop-blur-sm"
            >
              <Map className="w-4 h-4" />
              <span>{t.region}</span>
            </button>

            <a
              href="https://edgeone.ai/document/55642?product=pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 hover:text-blue-700 transition-all text-sm font-semibold backdrop-blur-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t.site}</span>
            </a>

            <a
              href="https://console.cloud.tencent.com/edgeone"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 hover:text-blue-700 transition-all text-sm font-semibold backdrop-blur-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t.console}</span>
            </a>

            <div className="w-px h-6 bg-blue-300/50 mx-2"></div>

            {/* Language Switcher (Fixed Hover) */}
            <div className="relative group py-2">
              <button
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-gray-700 transition-all text-sm font-semibold backdrop-blur-sm"
              >
                <Globe className="w-4 h-4" />
                <span>{languageLabels[language]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
              
              {/* Invisible bridge to prevent menu from closing when moving mouse */}
              <div className="absolute top-full left-0 w-full h-2"></div>

              <div className="absolute right-0 top-[calc(100%-0.5rem)] pt-2 w-32 hidden group-hover:block z-50">
                <div className="bg-white border border-gray-100 rounded-lg shadow-xl py-1 overflow-hidden ring-1 ring-black ring-opacity-5">
                  {(Object.keys(languageLabels) as Array<keyof typeof languageLabels>).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => onLanguageChange(lang)}
                      className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        language === lang ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'
                      }`}
                    >
                      {languageLabels[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onReset}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/40 hover:bg-red-50 hover:text-red-600 text-gray-700 transition-all text-sm font-semibold backdrop-blur-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.reset}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
