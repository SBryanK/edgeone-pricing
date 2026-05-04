import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/calculator';

interface SummaryProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  totals: { monthly: number; annual: number };
  itemCount: number;
}

export function Summary({ language, totals, itemCount }: SummaryProps) {
  const t = {
    title:
      language === 'zh'
        ? '总计'
        : language === 'kr'
        ? '합계'
        : language === 'jp'
        ? '合計'
        : language === 'id'
        ? 'Total'
        : 'Total',
    monthly:
      language === 'zh'
        ? '月度费用'
        : language === 'kr'
        ? '월간 비용'
        : language === 'jp'
        ? '月額費用'
        : language === 'id'
        ? 'Biaya Bulanan'
        : 'Monthly Cost',
    annual:
      language === 'zh'
        ? '年度费用'
        : language === 'kr'
        ? '연간 비용'
        : language === 'jp'
        ? '年額費用'
        : language === 'id'
        ? 'Biaya Tahunan'
        : 'Annual Cost',
    items:
      language === 'zh'
        ? '项服务'
        : language === 'kr'
        ? '항목'
        : language === 'jp'
        ? '件'
        : language === 'id'
        ? 'Item'
        : 'Items',
    perMonth:
      language === 'zh'
        ? '/月'
      : language === 'kr'
        ? '/월'
      : language === 'jp'
        ? '/月'
      : language === 'id'
        ? '/bulan'
      : '/mo',
    perYear:
      language === 'zh'
        ? '/年'
      : language === 'kr'
        ? '/년'
      : language === 'jp'
        ? '/年'
      : language === 'id'
        ? '/tahun'
      : '/yr',
    savings:
      language === 'zh'
        ? '年付节省'
        : language === 'kr'
        ? '연간 절감'
        : language === 'jp'
        ? '年間節約'
        : language === 'id'
        ? 'Hemat Tahunan'
        : 'Annual Savings',
  };

  const potentialSavings = totals.annual * 0.1;

  return (
    <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16 transition-all shadow-sm">
      {/* Items Count */}
      <div className="flex items-center space-x-2 text-primary-700">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-widest">{itemCount} {t.items}</span>
      </div>

      {/* Monthly Cost */}
      <div className="flex flex-col items-center">
        <span className="text-[10px] text-primary-500 font-bold uppercase tracking-wider mb-0.5">{t.monthly}</span>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-black text-primary-900 tracking-tight">{formatCurrency(totals.monthly)}</span>
          <span className="text-xs font-medium text-primary-400">{t.perMonth}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-10 bg-primary-200/50"></div>

      {/* Annual Cost */}
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-2 mb-0.5">
          <span className="text-[10px] text-primary-500 font-bold uppercase tracking-wider">{t.annual}</span>
          {totals.annual > 0 && (
            <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              -{formatCurrency(potentialSavings)}
            </span>
          )}
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-2xl font-black text-primary-600 tracking-tight">{formatCurrency(totals.annual)}</span>
          <span className="text-xs font-medium text-primary-400">{t.perYear}</span>
        </div>
      </div>
    </div>
  );
}
