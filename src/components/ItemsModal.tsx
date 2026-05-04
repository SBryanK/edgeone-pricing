import { X } from 'lucide-react';

interface ItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

export function ItemsModal({ isOpen, onClose, language }: ItemsModalProps) {
  if (!isOpen) return null;

  const t = {
    title: {
      en: 'Billing Items Guide',
      zh: '计费项目说明',
      kr: '청구 항목 안내',
      jp: '課金項目のガイド',
      id: 'Panduan Item Tagihan',
    }[language],
    imageAlt: {
      en: 'Billing items diagram',
      zh: '计费项目说明图',
      kr: '청구 항목 다이어그램',
      jp: '課金項目の図',
      id: 'Diagram item tagihan',
    }[language],
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="items-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 id="items-modal-title" className="text-xl font-bold text-gray-900">{t.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-4">
          <img
            src="/bi.png"
            alt={t.imageAlt}
            className="w-full h-auto rounded-lg shadow-sm"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
