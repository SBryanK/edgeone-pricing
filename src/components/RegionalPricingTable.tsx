import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  L7_TRAFFIC_PRICING,
  L4_TRAFFIC_PRICING,
  L7_BANDWIDTH_PRICING,
  L4_BANDWIDTH_PRICING,
  REGIONS,
} from '../data/pricing';
import { formatCurrency } from '../utils/calculator';

interface RegionalPricingTableProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

type TrafficType = 'l7_traffic' | 'l4_traffic' | 'l7_bandwidth' | 'l4_bandwidth';

const TIER_LABELS: Record<TrafficType, string[]> = {
  l7_traffic: ['0-2TB', '2-10TB', '10-50TB', '50-100TB', '100-500TB', '500-1000TB', '1000TB+'],
  l4_traffic: ['0-2TB', '2-10TB', '10-50TB', '50-100TB', '100-500TB', '500-1000TB', '1000TB+'],
  l7_bandwidth: ['0-500 Mbps', '500-5,000 Mbps', '5,000-50,000 Mbps', '50,000+ Mbps'],
  l4_bandwidth: ['0-500 Mbps', '500-5,000 Mbps', '5,000-50,000 Mbps', '50,000+ Mbps'],
};

export function RegionalPricingTable({ language }: RegionalPricingTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<TrafficType>('l7_traffic');

  const t = {
    title:
      language === 'zh'
        ? '区域定价参考'
        : language === 'kr'
        ? '지역별 요금표'
        : language === 'jp'
        ? '地域別料金'
        : language === 'id'
        ? 'Referensi Harga Regional'
        : 'Regional Pricing Reference',
    subtitle:
      language === 'zh'
        ? '不同区域和用量层级的流量/带宽单价'
        : language === 'kr'
        ? '지역 및 사용량 구간별 트래픽/대역폭 단가'
        : language === 'jp'
        ? '地域・使用量区分ごとのトラフィック／帯域幅単価'
        : language === 'id'
        ? 'Harga satuan trafik & bandwidth berdasarkan wilayah dan tier penggunaan'
        : 'Traffic & bandwidth unit prices by region and volume tier',
    l7_traffic:
      language === 'zh'
        ? 'L7 流量 (USD/GB)'
        : language === 'kr'
        ? 'L7 트래픽 (USD/GB)'
        : language === 'jp'
        ? 'L7 トラフィック (USD/GB)'
        : language === 'id'
        ? 'Trafik L7 (USD/GB)'
        : 'L7 Traffic (USD/GB)',
    l4_traffic:
      language === 'zh'
        ? 'L4 流量 (USD/GB)'
        : language === 'kr'
        ? 'L4 트래픽 (USD/GB)'
        : language === 'jp'
        ? 'L4 トラフィック (USD/GB)'
        : language === 'id'
        ? 'Trafik L4 (USD/GB)'
        : 'L4 Traffic (USD/GB)',
    l7_bandwidth:
      language === 'zh'
        ? 'L7 带宽 (USD/Mbps)'
        : language === 'kr'
        ? 'L7 대역폭 (USD/Mbps)'
        : language === 'jp'
        ? 'L7 帯域幅 (USD/Mbps)'
        : language === 'id'
        ? 'Bandwidth L7 (USD/Mbps)'
        : 'L7 Bandwidth (USD/Mbps)',
    l4_bandwidth:
      language === 'zh'
        ? 'L4 带宽 (USD/Mbps)'
        : language === 'kr'
        ? 'L4 대역폭 (USD/Mbps)'
        : language === 'jp'
        ? 'L4 帯域幅 (USD/Mbps)'
        : language === 'id'
        ? 'Bandwidth L4 (USD/Mbps)'
        : 'L4 Bandwidth (USD/Mbps)',
    tier:
      language === 'zh'
        ? '用量层级'
        : language === 'kr'
        ? '사용량 구간'
        : language === 'jp'
        ? '使用量区分'
        : language === 'id'
        ? 'Tier Penggunaan'
        : 'Volume Tier',
    expand:
      language === 'zh'
        ? '展开定价表'
        : language === 'kr'
        ? '요금표 펼치기'
        : language === 'jp'
        ? '料金表を展開'
        : language === 'id'
        ? 'Tampilkan Tabel Harga'
        : 'Expand Pricing Table',
    collapse:
      language === 'zh'
        ? '收起定价表'
        : language === 'kr'
        ? '요금표 접기'
        : language === 'jp'
        ? '料金表を閉じる'
        : language === 'id'
        ? 'Sembunyikan Tabel Harga'
        : 'Collapse Pricing Table',
    note:
      language === 'zh'
        ? '价格为阶梯计费，根据实际用量按对应层级单价计算'
        : language === 'kr'
        ? '요금은 구간별로 계산되며, 각 구간의 사용량에 따라 산정됩니다.'
        : language === 'jp'
        ? '料金は段階制で、各区分の使用量に応じて計算されます。'
        : language === 'id'
        ? 'Harga bersifat bertingkat. Biaya dihitung sesuai penggunaan pada tiap tier.'
        : 'Prices are tiered. Actual cost calculated based on usage within each tier.',
  };

  const getRegionName = (region: typeof REGIONS[number]) => {
    if (language === 'zh') return region.nameZh;
    if (language === 'kr') return region.nameKr || region.name;
    if (language === 'jp') return region.nameJp || region.name;
    if (language === 'id') return region.nameId || region.name;
    return region.name;
  };

  const pricingData =
    selectedType === 'l7_traffic'
      ? L7_TRAFFIC_PRICING
      : selectedType === 'l4_traffic'
      ? L4_TRAFFIC_PRICING
      : selectedType === 'l7_bandwidth'
      ? L7_BANDWIDTH_PRICING
      : L4_BANDWIDTH_PRICING;
  const tiers = pricingData[0].tiers;
  const tierLabels = TIER_LABELS[selectedType];
  const priceDecimals = selectedType.endsWith('bandwidth') ? 4 : 4;

  const typeOptions: { value: TrafficType; label: string }[] = [
    { value: 'l7_traffic', label: t.l7_traffic },
    { value: 'l4_traffic', label: t.l4_traffic },
    { value: 'l7_bandwidth', label: t.l7_bandwidth },
    { value: 'l4_bandwidth', label: t.l4_bandwidth },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{isExpanded ? t.collapse : t.expand}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Traffic Type Toggle */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex flex-wrap items-center gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedType(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedType === opt.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50">
                    {t.tier}
                  </th>
                  {REGIONS.map((region) => (
                    <th
                      key={region.id}
                      className="text-right px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {getRegionName(region)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiers.map((tier, tierIndex) => (
                  <tr key={tierIndex} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                      {tierLabels[tierIndex] ?? tier.tier}
                    </td>
                    {REGIONS.map((region) => {
                      const regionPricing = pricingData.find((p) => p.region === region.id);
                      const price = regionPricing?.tiers[tierIndex]?.pricePerGB || 0;
                      return (
                        <td
                          key={region.id}
                          className="px-3 py-3 text-right text-sm text-gray-600 font-mono"
                        >
                          {formatCurrency(price, priceDecimals)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="p-4 bg-blue-50 border-t border-blue-100">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">{t.note}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
