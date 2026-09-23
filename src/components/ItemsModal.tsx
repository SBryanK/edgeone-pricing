import type { Language } from '../types';
import { assetUrl } from '../utils/assets';
import { Modal } from './Modal';

interface ItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const TEXT = {
  title: { en: 'Billing Items Guide', zh: '计费项目说明', kr: '청구 항목 안내', jp: '課金項目のガイド', id: 'Panduan Item Tagihan' },
  imageAlt: {
    en: 'Billing items diagram',
    zh: '计费项目说明图',
    kr: '청구 항목 다이어그램',
    jp: '課金項目の図',
    id: 'Diagram item tagihan',
  },
};

export function ItemsModal({ isOpen, onClose, language }: ItemsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={TEXT.title[language]}>
      <img src={assetUrl('bi.png')} alt={TEXT.imageAlt[language]} className="w-full h-auto rounded-lg shadow-sm" loading="lazy" />
    </Modal>
  );
}
