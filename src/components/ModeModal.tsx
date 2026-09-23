import type { Language } from '../types';
import { assetUrl } from '../utils/assets';
import { Modal } from './Modal';

interface ModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const TEXT = {
  title: { en: 'Billing Mode', zh: '计费模式', kr: '결제 모드', jp: '課金モード', id: 'Mode Penagihan' },
  imageAlt: {
    en: 'Discount mode diagram',
    zh: '折扣模式说明图',
    kr: '할인 모드 다이어그램',
    jp: '割引モードの図',
    id: 'Diagram mode diskon',
  },
  tiers: {
    en: 'Tiered traffic: Enterprise postpaid bills the whole month at the attained tier (e.g. 15 TB in the Chinese mainland = 15 × 1000 × $0.0399). Enterprise prepaid and Personal / Basic / Standard bill each slice at its own tier (progressive). Choose the method per draft in the estimate panel.',
    zh: '阶梯流量：企业版后付费按整月达到的档位计价（例如中国大陆 15 TB = 15 × 1000 × $0.0399）。企业版预付费及个人版 / 基础版 / 标准版按阶梯累进计价。可在估算面板中为每个草稿选择计费方式。',
    kr: '구간 트래픽: 엔터프라이즈 후불은 월 전체를 도달한 구간 단가로 과금합니다(예: 중국 본토 15 TB = 15 × 1000 × $0.0399). 엔터프라이즈 선불과 개인/베이직/스탠다드는 구간별 누진 과금입니다. 견적 패널에서 초안별로 선택하세요.',
    jp: '段階トラフィック：エンタープライズ後払いは月間全量を到達段階の単価で課金します（例：中国本土 15 TB = 15 × 1000 × $0.0399）。エンタープライズ前払いと個人/ベーシック/スタンダードは累進課金です。見積パネルで下書きごとに選択できます。',
    id: 'Trafik bertingkat: Enterprise pascabayar menagih seluruh bulan dengan harga tier yang dicapai (mis. 15 TB di Tiongkok Daratan = 15 × 1000 × $0.0399). Enterprise prabayar dan Personal / Basic / Standard ditagih progresif per tier. Pilih metodenya per draf di panel estimasi.',
  },
};

export function ModeModal({ isOpen, onClose, language }: ModeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={TEXT.title[language]}>
      <p className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 leading-relaxed">{TEXT.tiers[language]}</p>
      <img src={assetUrl('bm.png')} alt={TEXT.imageAlt[language]} className="w-full h-auto rounded-lg shadow-sm" loading="lazy" />
    </Modal>
  );
}
