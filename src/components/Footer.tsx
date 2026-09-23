import { Globe2, ExternalLink } from 'lucide-react';
import type { Language } from '../types';
import { PRICING_AS_OF } from '../data/pricing';
import { OFFICIAL_DOCS } from '../data/sources';

interface FooterProps {
  language: Language;
}

/**
 * Global site footer. Rendered once at the bottom of the app shell so it
 * stays visible on both the catalog view and the compare view. It is
 * deliberately compact (single line on desktop, two lines on mobile) so
 * it does not eat vertical space that the calculator / estimate slip
 * needs on small screens.
 *
 * Content is fully localised; when adding a new language make sure to
 * extend each string map below.
 */
export function Footer({ language }: FooterProps) {
  const year = new Date().getFullYear();

  const t = {
    copyright: {
      en: `© ${year} Tencent EdgeOne Pricing Calculator. All rights reserved.`,
      zh: `© ${year} 腾讯 EdgeOne 定价计算器。保留所有权利。`,
      kr: `© ${year} Tencent EdgeOne 가격 계산기. 모든 권리 보유.`,
      jp: `© ${year} Tencent EdgeOne 価格計算ツール。All rights reserved.`,
      id: `© ${year} Kalkulator Harga Tencent EdgeOne. Hak cipta dilindungi.`,
    }[language],
    reviewed: {
      en: `Prices reviewed ${PRICING_AS_OF}`,
      zh: `价格核对于 ${PRICING_AS_OF}`,
      kr: `가격 검토일 ${PRICING_AS_OF}`,
      jp: `料金確認日 ${PRICING_AS_OF}`,
      id: `Harga ditinjau ${PRICING_AS_OF}`,
    }[language],
    sources: {
      en: 'Official billing docs',
      zh: '官方计费文档',
      kr: '공식 과금 문서',
      jp: '公式課金ドキュメント',
      id: 'Dokumen tagihan resmi',
    }[language],
    disclaimer: {
      en: 'Prices are indicative. Contact your account manager for contractual rates.',
      zh: '价格仅供参考，最终价格请联系您的客户经理。',
      kr: '가격은 참고용입니다. 계약 요율은 담당 매니저에게 문의하세요.',
      jp: '価格は参考値です。契約料金は担当者までお問い合わせください。',
      id: 'Harga bersifat indikatif. Hubungi account manager Anda untuk tarif kontraktual.',
    }[language],
    internal: {
      en: 'Internal Tool',
      zh: '内部工具',
      kr: '내부 도구',
      jp: '社内ツール',
      id: 'Alat Internal',
    }[language],
  };

  return (
    <footer
      className="shrink-0 border-t border-gray-200 bg-white/80 backdrop-blur-sm text-gray-500 text-[11px] px-4 py-2"
      role="contentinfo"
    >
      <div className="mx-auto max-w-[1800px] flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4">
        {/* Left: copyright + internal badge */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="font-medium text-gray-600">{t.copyright}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold tracking-wide uppercase text-[9px]">
            <Globe2 className="w-3 h-3" />
            {t.internal}
          </span>
        </div>

        {/* Center (hidden on mobile for space): disclaimer */}
        <p className="hidden md:block text-gray-400 italic truncate max-w-md">
          {t.disclaimer}
        </p>

        {/* Right: price-list review date + official sources */}
        <div className="flex items-center gap-2 text-gray-500">
          <span>{t.reviewed}</span>
          <a
            href={OFFICIAL_DOCS.billingOverview}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
          >
            {t.sources} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
