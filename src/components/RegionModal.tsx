import { ExternalLink } from 'lucide-react';
import { REGIONS } from '../data/pricing';
import { OFFICIAL_DOCS } from '../data/sources';
import type { Language } from '../types';
import { getRegionName } from '../utils/calculator';
import { Modal } from './Modal';

interface RegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const TEXT = {
  title: { en: 'Billing Regions', zh: '计费区域', kr: '과금 지역', jp: '課金地域', id: 'Wilayah Tagihan' },
  region: { en: 'Region', zh: '区域', kr: '지역', jp: '地域', id: 'Wilayah' },
  description: { en: 'Examples', zh: '示例', kr: '예시', jp: '例', id: 'Contoh' },
  note: {
    en: 'The billing region is where the EdgeOne node serving the end user is located, not where your origin is. The country lists below are examples only; use the official country-to-region mapping for quotes.',
    zh: '计费区域以为终端用户提供服务的 EdgeOne 节点所在地为准，而非源站所在地。以下国家仅为示例，报价请以官方的国家与计费区域对应关系为准。',
    kr: '과금 지역은 원본 서버가 아니라 최종 사용자에게 서비스하는 EdgeOne 노드의 위치입니다. 아래 국가는 예시일 뿐이므로 견적 시 공식 국가-지역 매핑을 확인하세요.',
    jp: '課金地域はオリジンではなく、エンドユーザーにサービスを提供する EdgeOne ノードの所在地です。以下の国は例にすぎません。見積には公式の国と地域の対応表を使用してください。',
    id: 'Wilayah tagihan adalah lokasi node EdgeOne yang melayani pengguna akhir, bukan lokasi origin. Daftar negara di bawah hanya contoh; gunakan pemetaan negara-ke-wilayah resmi untuk penawaran.',
  },
  official: {
    en: 'Official billing documentation',
    zh: '官方计费文档',
    kr: '공식 과금 문서',
    jp: '公式課金ドキュメント',
    id: 'Dokumentasi tagihan resmi',
  },
};

export function RegionModal({ isOpen, onClose, language }: RegionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={TEXT.title[language]} size="md">
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 leading-relaxed">
        {TEXT.note[language]}{' '}
        <a href={OFFICIAL_DOCS.outOfPlan} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline">
          {TEXT.official[language]} <ExternalLink className="w-3 h-3" />
        </a>
      </p>
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs sticky top-0">
          <tr>
            <th className="px-4 py-3">{TEXT.region[language]}</th>
            <th className="px-4 py-3">{TEXT.description[language]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {REGIONS.map((region) => {
            const description =
              { en: region.description, zh: region.descriptionZh, kr: region.descriptionKr, jp: region.descriptionJp, id: region.descriptionId }[
                language
              ] || region.description;
            return (
              <tr key={region.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{getRegionName(region.id, language)}</td>
                <td className="px-4 py-3 text-gray-600">{description}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Modal>
  );
}
