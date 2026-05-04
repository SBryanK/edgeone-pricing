import { Trash2, Edit2, MapPin } from 'lucide-react';
import type { CalculatedItem, CalculatorInput, Region } from '../types';
import { formatCurrency, formatNumber } from '../utils/calculator';
import { REGIONS, SERVICE_ITEMS } from '../data/pricing';
import { useState } from 'react';

interface PricingTableProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  items: CalculatorInput[];
  calculatedItems: CalculatedItem[];
  onUpdateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (index: number) => void;
}

export function PricingTable({
  language,
  items,
  calculatedItems,
  onUpdateItem,
  onRemoveItem,
}: PricingTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const t = {
    title:
      language === 'zh'
        ? '费用明细'
        : language === 'kr'
        ? '비용 상세'
        : language === 'jp'
        ? '費用明細'
        : language === 'id'
        ? 'Rincian Biaya'
        : 'Cost Details',
    empty:
      language === 'zh'
        ? '暂无服务项目，请从左侧添加'
        : language === 'kr'
        ? '아직 항목이 없습니다. 왼쪽 카탈로그에서 추가하세요.'
        : language === 'jp'
        ? 'まだ項目がありません。左のカタログから追加してください。'
        : language === 'id'
        ? 'Belum ada item. Pilih layanan dari katalog di kiri.'
        : 'No items yet. Select services from the catalog on the left.',
    service:
      language === 'zh'
        ? '服务项目'
        : language === 'kr'
        ? '서비스'
        : language === 'jp'
        ? 'サービス'
        : language === 'id'
        ? 'Layanan'
        : 'Service',
    region:
      language === 'zh'
        ? '区域'
        : language === 'kr'
        ? '지역'
        : language === 'jp'
        ? '地域'
        : language === 'id'
        ? 'Wilayah'
        : 'Region',
    quantity:
      language === 'zh'
        ? '用量'
        : language === 'kr'
        ? '수량'
        : language === 'jp'
        ? '数量'
        : language === 'id'
        ? 'Jumlah'
        : 'Quantity',
    unitPrice:
      language === 'zh'
        ? '单价'
        : language === 'kr'
        ? '단가'
        : language === 'jp'
        ? '単価'
        : language === 'id'
        ? 'Harga Satuan'
        : 'Unit Price',
    listPrice:
      language === 'zh'
        ? '原价'
      : language === 'kr'
        ? '정가'
      : language === 'jp'
        ? '定価'
      : language === 'id'
        ? 'Harga Daftar'
      : 'List Price',
    discount:
      language === 'zh'
        ? '折扣'
        : language === 'kr'
        ? '할인'
        : language === 'jp'
        ? '割引'
        : language === 'id'
        ? 'Diskon'
        : 'Discount',
    finalPrice:
      language === 'zh'
        ? '折后价'
        : language === 'kr'
        ? '할인가'
        : language === 'jp'
        ? '割引後'
        : language === 'id'
        ? 'Harga Akhir'
        : 'Final Price',
    actions:
      language === 'zh'
        ? '操作'
        : language === 'kr'
        ? '작업'
        : language === 'jp'
        ? '操作'
        : language === 'id'
        ? 'Aksi'
        : 'Actions',
    save:
      language === 'zh'
        ? '保存'
        : language === 'kr'
        ? '저장'
        : language === 'jp'
        ? '保存'
        : language === 'id'
        ? 'Simpan'
        : 'Save',
    cancel:
      language === 'zh'
        ? '取消'
        : language === 'kr'
        ? '취소'
        : language === 'jp'
        ? 'キャンセル'
        : language === 'id'
        ? 'Batal'
        : 'Cancel',
  };

  const getService = (serviceId: string) => SERVICE_ITEMS.find((s) => s.id === serviceId);
  const getServiceDescription = (service?: (typeof SERVICE_ITEMS)[number]) => {
    if (!service) return '';
    if (language === 'id') return service.descriptionId || service.description;
    return service.description;
  };
  const getRegionName = (region: (typeof REGIONS)[number]) => {
    if (language === 'zh') return region.nameZh;
    if (language === 'kr') return region.nameKr || region.name;
    if (language === 'jp') return region.nameJp || region.name;
    if (language === 'id') return region.nameId || region.name;
    return region.name;
  };

  if (calculatedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="w-20 h-20 mb-6 rounded-full bg-primary-50 flex items-center justify-center text-primary-400">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h3>
        <p className="text-gray-400 max-w-sm">{t.empty}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-100">
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t.service}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">{t.region}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] text-right">{t.quantity}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] text-right">{t.unitPrice}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] text-right">{t.listPrice}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] text-right">{t.discount}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] text-right">{t.finalPrice}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] text-center">{t.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {calculatedItems.map((item, index) => {
            const inputItem = items[index];
            const service = getService(item.serviceId);
            const isEditing = editingIndex === index;

            return (
              <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="text-sm font-bold text-gray-900">{item.serviceName}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 max-w-xs truncate">{getServiceDescription(service)}</div>
                </td>
                <td className="px-6 py-5">
                  {item.region ? (
                    isEditing && service?.hasRegionalPricing ? (
                      <select
                        value={inputItem.region || 'chinese_mainland'}
                        onChange={(e) => onUpdateItem(index, { region: e.target.value as Region })}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 outline-none"
                      >
                        {REGIONS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {getRegionName(r)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="w-3 h-3 mr-1 text-gray-300" />
                        {item.regionName}
                      </div>
                    )
                  ) : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-6 py-5 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end space-x-1">
                      <input
                        type="number"
                        min="1"
                        value={inputItem.quantity}
                        onChange={(e) => onUpdateItem(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-20 text-xs text-right border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                      <span className="text-[10px] text-gray-400 font-medium">{item.unit}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end space-x-1">
                      <span className="text-sm font-bold text-gray-900">{formatNumber(item.quantity)}</span>
                      <span className="text-[10px] text-gray-400 font-medium">{item.unit}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-5 text-right text-xs text-gray-400 font-medium">{formatCurrency(item.unitPrice, 4)}</td>
                <td className="px-6 py-5 text-right text-xs text-gray-400 font-medium">{formatCurrency(item.listPrice)}</td>
                <td className="px-6 py-5 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end space-x-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputItem.discount}
                        onChange={(e) => onUpdateItem(index, { discount: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className="w-16 text-xs text-right border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                      <span className="text-[10px] text-gray-400">%</span>
                    </div>
                  ) : (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${item.discount > 0 ? 'bg-green-50 text-green-600' : 'text-gray-300'}`}>
                      {item.discount}% OFF
                    </span>
                  )}
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="text-sm font-black text-primary-600 tracking-tight">{formatCurrency(item.finalPrice)}</span>
                </td>
                <td className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => setEditingIndex(null)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded transition-colors text-[10px] font-bold uppercase">{t.save}</button>
                        <button onClick={() => setEditingIndex(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded transition-colors text-[10px] font-bold uppercase">{t.cancel}</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingIndex(index)} className="p-2 text-gray-300 hover:text-primary-500 hover:bg-primary-50 rounded transition-all opacity-0 group-hover:opacity-100"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onRemoveItem(index)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
