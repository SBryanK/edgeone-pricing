import { X } from 'lucide-react';

interface ModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

export function ModeModal({ isOpen, onClose, language }: ModeModalProps) {
  if (!isOpen) return null;

  const t = {
    title: {
      en: 'Billing Mode',
      zh: '计费模式',
      kr: '결제 모드',
      jp: '課金モード',
      id: 'Mode Penagihan',
    }[language],
    imageAlt: {
      en: 'Discount mode diagram',
      zh: '折扣模式说明图',
      kr: '할인 모드 다이어그램',
      jp: '割引モードの図',
      id: 'Diagram mode diskon',
    }[language],
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 id="mode-modal-title" className="text-xl font-bold text-gray-900">{t.title}</h2>
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
            src="/bm.png"
            alt={t.imageAlt}
            className="w-full h-auto rounded-lg shadow-sm"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
