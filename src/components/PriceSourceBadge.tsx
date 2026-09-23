import { BadgeCheck, CircleAlert } from 'lucide-react';
import type { Language } from '../types';
import { getPriceSource } from '../data/sources';

const LABELS = {
  verified: { en: 'Official', zh: '官方', kr: '공식', jp: '公式', id: 'Resmi' },
  reference: { en: 'Reference', zh: '参考', kr: '참고', jp: '参考', id: 'Referensi' },
  verifiedTip: {
    en: 'Checked against the official EdgeOne docs',
    zh: '已对照 EdgeOne 官方文档核实',
    kr: 'EdgeOne 공식 문서로 확인됨',
    jp: 'EdgeOne 公式ドキュメントで確認済み',
    id: 'Sudah dicek dengan dokumen resmi EdgeOne',
  },
  referenceTip: {
    en: 'Not re-verified in the official docs; confirm before quoting',
    zh: '未在官方文档中再次核实，报价前请确认',
    kr: '공식 문서로 재확인되지 않음. 견적 전 확인하세요',
    jp: '公式ドキュメントで再確認されていません。見積前に確認してください',
    id: 'Belum diverifikasi ulang di dokumen resmi; konfirmasi sebelum memberi penawaran',
  },
} as const;

export function PriceSourceBadge({ serviceId, language }: { serviceId: string; language: Language }) {
  const source = getPriceSource(serviceId);
  const verified = source.status === 'verified';
  const tip = `${(verified ? LABELS.verifiedTip : LABELS.referenceTip)[language]}${source.note ? ` — ${source.note}` : ''}`;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={tip}
      aria-label={tip}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border transition-colors ${
        verified
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      }`}
    >
      {verified ? <BadgeCheck className="w-3 h-3" /> : <CircleAlert className="w-3 h-3" />}
      {(verified ? LABELS.verified : LABELS.reference)[language]}
    </a>
  );
}
