import { useState } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Trash2, Percent, Download, Tag, ChevronDown, Info, Loader2 } from 'lucide-react';
import type { BillingMode, CalculatorInput, CalculatedItem, DisplayUnit, Language, TierMode } from '../types';
import { displayMultiplier, formatCurrency, formatNumber, formatUnitPrice, tierModeLabel } from '../utils/calculator';
import { isFixedQuantityService, PRICING_AS_OF } from '../data/pricing';
import { NumberInput } from './NumberInput';

export type ExportFormat = 'csv' | 'json' | 'excel';

interface EstimateSlipProps {
  language: Language;
  items: CalculatorInput[];
  calculatedItems: CalculatedItem[];
  totals: { monthly: number; annual: number };
  globalDiscount: number;
  billingMode: BillingMode;
  tierMode: TierMode;
  onBillingModeChange: (mode: BillingMode) => void;
  onUpdateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (index: number) => void;
  onGlobalDiscountChange: (discount: number) => void;
  onExport: (format: ExportFormat) => void;
  isExporting?: boolean;
  onDraftDrop?: (draftId: string) => void;
  discountMode?: 'global' | 'item';
  onDiscountModeChange?: (mode: 'global' | 'item') => void;
}

const TEXT = {
  title: { en: 'Cost Estimate', zh: '费用估算', kr: '비용 견적', jp: '見積', id: 'Estimasi Biaya' },
  empty: {
    en: 'Add services from the catalog, or drag them here',
    zh: '从目录添加服务，或拖拽到这里',
    kr: '카탈로그에서 서비스를 추가하거나 여기로 드래그하세요',
    jp: 'カタログから追加するか、ここにドラッグしてください',
    id: 'Tambahkan layanan dari katalog, atau seret ke sini',
  },
  monthly: { en: 'Monthly Total', zh: '月度合计', kr: '월간 합계', jp: '月額合計', id: 'Total Bulanan' },
  annual: { en: 'Annual Total (×12)', zh: '年度合计（×12）', kr: '연간 합계 (×12)', jp: '年額合計（×12）', id: 'Total Tahunan (×12)' },
  listTotal: { en: 'List price', zh: '目录价', kr: '정가', jp: '定価', id: 'Harga daftar' },
  savings: { en: 'Discount', zh: '折扣', kr: '할인', jp: '割引', id: 'Diskon' },
  globalDiscount: { en: 'Global Discount', zh: '全局折扣', kr: '전체 할인', jp: '全体割引', id: 'Diskon Global' },
  itemDiscount: { en: 'Item Discount', zh: '单项折扣', kr: '항목별 할인', jp: '個別割引', id: 'Diskon Item' },
  export: { en: 'Export Quote', zh: '导出报价', kr: '견적서 내보내기', jp: '見積書をエクスポート', id: 'Ekspor Penawaran' },
  exportFormat: { en: 'Choose export format', zh: '选择导出格式', kr: '내보내기 형식 선택', jp: 'エクスポート形式を選択', id: 'Pilih format ekspor' },
  global: { en: 'Global discount', zh: '全局折扣', kr: '전체 할인', jp: '全体割引', id: 'Diskon global' },
  item: { en: 'Per-item discount', zh: '单项折扣', kr: '항목별 할인', jp: '個別割引', id: 'Diskon per item' },
  dropDraft: {
    en: 'Drop Draft to Compare',
    zh: '拖放草稿进行对比',
    kr: '비교할 초안을 여기에 놓으세요',
    jp: '下書きをここにドロップして比較',
    id: 'Lepas draf untuk dibandingkan',
  },
  items: { en: 'items', zh: '项', kr: '항목', jp: '件', id: 'item' },
  active: { en: 'ACTIVE', zh: '已启用', kr: '활성', jp: '有効', id: 'AKTIF' },
  remove: { en: 'Remove item', zh: '删除项目', kr: '항목 삭제', jp: '項目を削除', id: 'Hapus item' },
  tierPricing: { en: 'Tiered traffic pricing', zh: '阶梯计费方式', kr: '구간 요금 방식', jp: '段階料金方式', id: 'Metode harga bertingkat' },
  auto: { en: 'Auto', zh: '自动', kr: '자동', jp: '自動', id: 'Otomatis' },
  attained: {
    en: 'Attained tier — Enterprise postpaid',
    zh: '阶梯到达 — 企业版后付费',
    kr: '도달 구간 — 엔터프라이즈 후불',
    jp: '到達段階 — エンタープライズ後払い',
    id: 'Tier tercapai — Enterprise pascabayar',
  },
  progressive: {
    en: 'Progressive — Enterprise prepaid / Personal / Basic / Standard',
    zh: '阶梯累进 — 企业版预付费 / 个人版 / 基础版 / 标准版',
    kr: '누진 구간 — 엔터프라이즈 선불 / 개인 / 베이직 / 스탠다드',
    jp: '累進段階 — エンタープライズ前払い / 個人 / ベーシック / スタンダード',
    id: 'Progresif — Enterprise prabayar / Personal / Basic / Standard',
  },
  tierHelp: {
    en: 'Attained: the whole month is billed at the tier reached. Progressive: each slice at its own tier. Auto follows the plan in this draft.',
    zh: '阶梯到达：整月用量按达到的档位计价。阶梯累进：每段用量按各自档位计价。自动：按本草稿中的套餐判断。',
    kr: '도달 구간: 월 전체 사용량을 도달한 구간 단가로 과금. 누진: 구간별 단가로 과금. 자동: 이 초안의 요금제를 따름.',
    jp: '到達段階：月間使用量全体を到達した段階の単価で課金。累進：各段階の単価で課金。自動：この下書きのプランに従う。',
    id: 'Tier tercapai: seluruh pemakaian bulan ditagih dengan harga tier yang dicapai. Progresif: tiap porsi dengan harga tier-nya. Otomatis mengikuti paket di draf ini.',
  },
  quotaHint: {
    en: 'Plan quotas are not deducted automatically — enter only usage beyond the plan quota.',
    zh: '套餐内额度不会自动扣减——请仅填写超出套餐的用量。',
    kr: '요금제 포함량은 자동 차감되지 않습니다. 포함량을 초과한 사용량만 입력하세요.',
    jp: 'プラン内の枠は自動で差し引かれません。枠を超えた使用量のみ入力してください。',
    id: 'Kuota paket tidak dipotong otomatis — isi hanya pemakaian di atas kuota paket.',
  },
  asOf: {
    en: `Indicative list prices, reviewed ${PRICING_AS_OF}. Not an official quotation.`,
    zh: `参考目录价，核对于 ${PRICING_AS_OF}。非正式报价。`,
    kr: `참고용 정가 (${PRICING_AS_OF} 검토). 공식 견적이 아닙니다.`,
    jp: `参考定価（${PRICING_AS_OF} 確認）。正式な見積ではありません。`,
    id: `Harga daftar indikatif, ditinjau ${PRICING_AS_OF}. Bukan penawaran resmi.`,
  },
  blended: { en: 'avg', zh: '均价', kr: '평균', jp: '平均', id: 'rata-rata' },
  tier: { en: 'tier', zh: '档位', kr: '구간', jp: '段階', id: 'tier' },
} as const;

type TextKey = keyof typeof TEXT;

const PLAN_IDS_WITH_QUOTA = new Set(['plan_personal', 'plan_basic', 'plan_standard']);

interface DraggableEstimateItemProps {
  item: CalculatedItem;
  inputItem: CalculatorInput;
  index: number;
  onUpdateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (index: number) => void;
  discountMode: 'global' | 'item';
  t: (key: TextKey) => string;
}

function DraggableEstimateItem({ item, inputItem, index, onUpdateItem, onRemoveItem, discountMode, t }: DraggableEstimateItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${index}`,
    data: { type: 'remove-item', index },
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000, opacity: 0.8 } : undefined;

  const hasItemDiscount = item.discount > 0;
  const isFixedQuantity = isFixedQuantityService(item.serviceId);
  const displayUnit = inputItem.displayUnit;
  const mult = displayMultiplier(displayUnit);
  const displayQuantity = inputItem.quantity / mult;
  const unitSuffix = displayUnit ? `/${displayUnit}` : item.unit;

  // Rate line: flat items show the unit price; tiered items the tier reached
  // (and the blended average when progressive tiers mix several rates).
  const rateText = item.tierLabel
    ? `${formatUnitPrice(item.unitPrice * mult)}${unitSuffix} · ${t('tier')} ${item.tierLabel}${
        item.tierMode === 'progressive' && Math.abs(item.effectiveUnitPrice - item.unitPrice) > 1e-12
          ? ` · ${t('blended')} ${formatUnitPrice(item.effectiveUnitPrice * mult)}${unitSuffix}`
          : ''
      }`
    : `${formatUnitPrice(item.unitPrice)}${item.unit}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group hover:border-blue-400 hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Whole card is the drag handle; interactive children opt back in. */}
      <div {...attributes} {...listeners} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing rounded-xl" aria-hidden="true" tabIndex={-1} />

      <div className="relative z-10 pointer-events-none">
        <button
          type="button"
          onClick={() => onRemoveItem(index)}
          aria-label={t('remove')}
          title={t('remove')}
          className="absolute -top-1 -right-1 text-gray-300 hover:text-red-500 transition-colors p-1.5 pointer-events-auto rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="pr-8 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 leading-tight break-words">{item.serviceName}</h4>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {item.regionName && (
              <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase tracking-wider">
                {item.regionName}
              </span>
            )}
            <span className="text-[11px] text-gray-500 tabular-nums">{rateText}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 relative z-10">
        <div className="min-w-0 pointer-events-auto">
          {isFixedQuantity ? (
            <span className="inline-flex items-center bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100 text-xs font-medium text-gray-500">
              {formatNumber(inputItem.quantity)} {item.unit}
            </span>
          ) : (
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 focus-within:border-blue-400">
              <NumberInput
                value={displayQuantity}
                onChange={(val) => onUpdateItem(index, { quantity: val * mult })}
                min={0}
                aria-label="Quantity"
                className="w-20 text-xs font-bold text-gray-900 bg-transparent text-center outline-none"
              />
              {displayUnit ? (
                <div className="relative">
                  <select
                    value={displayUnit}
                    aria-label="Unit"
                    // Changing the unit converts the display only; the stored GB volume (and price) is unchanged.
                    onChange={(e) => onUpdateItem(index, { displayUnit: e.target.value as DisplayUnit })}
                    className="appearance-none h-full pl-2 pr-5 bg-transparent text-gray-600 text-[11px] font-bold outline-none cursor-pointer"
                  >
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                    <option value="PB">PB</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                </div>
              ) : (
                <span className="text-[10px] font-bold text-gray-400 px-2 border-l border-gray-200 whitespace-nowrap">{item.unit.replace(/^\//, '')}</span>
              )}
            </div>
          )}
        </div>

        <div className="text-right shrink-0 pointer-events-none">
          {hasItemDiscount && (
            <div className="text-[10px] text-gray-400 line-through tabular-nums">{formatCurrency(item.listPrice)}</div>
          )}
          <div className="text-lg font-black text-gray-900 tracking-tight tabular-nums">{formatCurrency(item.finalPrice)}</div>
        </div>
      </div>

      {discountMode === 'item' && (
        <div className="flex items-center justify-between pt-2 mt-3 border-t border-gray-100 relative z-10">
          <div className="flex items-center gap-2">
            <Tag className={`w-3 h-3 ${hasItemDiscount ? 'text-green-500' : 'text-gray-300'}`} />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('itemDiscount')}</span>
          </div>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md pointer-events-auto ${
              hasItemDiscount ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <NumberInput
              value={inputItem.discount}
              onChange={(val) => onUpdateItem(index, { discount: val })}
              min={0}
              max={100}
              aria-label={t('itemDiscount')}
              className={`w-10 text-xs font-bold text-right outline-none bg-transparent ${hasItemDiscount ? 'text-green-600' : 'text-gray-600'}`}
            />
            <span className={`text-[10px] font-bold ${hasItemDiscount ? 'text-green-600' : 'text-gray-400'}`}>%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function EstimateSlip({
  language,
  items,
  calculatedItems,
  totals,
  globalDiscount,
  billingMode,
  tierMode,
  onBillingModeChange,
  onUpdateItem,
  onRemoveItem,
  onGlobalDiscountChange,
  onExport,
  isExporting = false,
  onDraftDrop,
  discountMode: externalDiscountMode,
  onDiscountModeChange,
}: EstimateSlipProps) {
  const [internalDiscountMode, setInternalDiscountMode] = useState<'global' | 'item'>('global');
  const [isDraftDragOver, setIsDraftDragOver] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const t = (key: TextKey) => TEXT[key][language];

  const discountMode = externalDiscountMode ?? internalDiscountMode;
  const setDiscountMode = (mode: 'global' | 'item') => {
    // Switching back to global re-applies the draft discount to every line.
    if (mode === 'global' && discountMode !== 'global') onGlobalDiscountChange(globalDiscount);
    if (onDiscountModeChange) onDiscountModeChange(mode);
    else setInternalDiscountMode(mode);
  };

  const { setNodeRef, isOver } = useDroppable({ id: 'estimate-slip' });

  const listTotal = calculatedItems.reduce((s, i) => s + i.listPrice, 0);
  const savings = listTotal - totals.monthly;
  const hasTiered = calculatedItems.some((i) => i.tierLabel);
  const hasQuotaPlan = items.some((i) => PLAN_IDS_WITH_QUOTA.has(i.serviceId));

  const isDraftTransfer = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types || []).includes('application/x-edgeone-draft-tab');

  const handleDragEnter = (event: React.DragEvent) => {
    if (!onDraftDrop || !isDraftTransfer(event)) return;
    event.preventDefault();
    setIsDraftDragOver(true);
  };
  const handleDragOver = (event: React.DragEvent) => {
    if (!onDraftDrop || !isDraftTransfer(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  const handleDragLeave = (event: React.DragEvent) => {
    if (!onDraftDrop || !isDraftTransfer(event)) return;
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDraftDragOver(false);
  };
  const handleDrop = (event: React.DragEvent) => {
    if (!onDraftDrop || !isDraftTransfer(event)) return;
    event.preventDefault();
    setIsDraftDragOver(false);
    const draftId = event.dataTransfer.getData('application/x-edgeone-draft-tab');
    if (draftId) onDraftDrop(draftId);
  };

  const exportAs = (format: ExportFormat) => {
    setIsExportMenuOpen(false);
    onExport(format);
  };

  return (
    <div
      ref={setNodeRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white h-full flex flex-col border-l shadow-xl z-20 w-full transition-colors relative ${
        isOver || isDraftDragOver ? 'border-blue-400 bg-blue-50/50 ring-2 ring-inset ring-blue-400' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <span className="w-1 h-5 bg-blue-600 rounded-full mr-3" />
            {t('title')}
          </h2>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {calculatedItems.length} {t('items')}
          </span>
        </div>

        <div>
          <label htmlFor="billing-mode" className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            {t('tierPricing')}
            <span title={t('tierHelp')} aria-label={t('tierHelp')} className="text-gray-400 cursor-help normal-case">
              <Info className="w-3 h-3" />
            </span>
          </label>
          <div className="relative">
            <select
              id="billing-mode"
              value={billingMode}
              onChange={(e) => onBillingModeChange(e.target.value as BillingMode)}
              className="w-full appearance-none text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="auto">
                {t('auto')} → {tierModeLabel(tierMode)}
              </option>
              <option value="attained">{t('attained')}</option>
              <option value="progressive">{t('progressive')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {calculatedItems.length > 0 && (
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1" role="radiogroup" aria-label="Discount mode">
            {(['global', 'item'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={discountMode === mode}
                onClick={() => setDiscountMode(mode)}
                className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${
                  discountMode === mode ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t(mode)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 relative">
        {isDraftDragOver && (
          <div className="absolute inset-0 z-20 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center border-2 border-dashed border-blue-400 rounded-xl">
            <div className="bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-blue-700">{t('dropDraft')}</div>
          </div>
        )}
        {(hasQuotaPlan || (hasTiered && calculatedItems.length > 0)) && (
          <div className="flex gap-2 text-[11px] leading-snug text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{hasQuotaPlan ? t('quotaHint') : t('tierHelp')}</span>
          </div>
        )}
        {calculatedItems.length === 0 ? (
          <div
            className={`text-center py-12 px-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
              isOver || isDraftDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 text-gray-500'
            }`}
          >
            <Download className={`w-8 h-8 mb-2 ${isOver ? 'text-blue-500 animate-bounce' : 'text-gray-300'}`} />
            <p className="text-sm font-medium">{t('empty')}</p>
          </div>
        ) : (
          calculatedItems.map((item, index) => (
            <DraggableEstimateItem
              key={`${item.serviceId}-${index}`}
              item={item}
              inputItem={items[index]}
              index={index}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              discountMode={discountMode}
              t={t}
            />
          ))
        )}
      </div>

      {/* Footer / Summary */}
      <div className="p-4 sm:p-5 border-t border-gray-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-10 shrink-0">
        {discountMode === 'global' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="global-discount" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {t('globalDiscount')}
              </label>
              {globalDiscount > 0 && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{t('active')}</span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Percent className={`h-4 w-4 ${globalDiscount > 0 ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
              <NumberInput
                value={globalDiscount}
                onChange={onGlobalDiscountChange}
                min={0}
                max={100}
                aria-label={t('globalDiscount')}
                className={`block w-full pl-10 pr-4 py-2 text-sm font-bold border rounded-xl outline-none transition-all ${
                  globalDiscount > 0
                    ? 'border-green-500 ring-2 ring-green-100 text-green-700'
                    : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                }`}
              />
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {savings > 0.005 && (
            <>
              <div className="flex justify-between items-baseline text-xs text-gray-500">
                <span>{t('listTotal')}</span>
                <span className="tabular-nums line-through">{formatCurrency(listTotal)}</span>
              </div>
              <div className="flex justify-between items-baseline text-xs text-green-600 font-semibold">
                <span>{t('savings')}</span>
                <span className="tabular-nums">−{formatCurrency(savings)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('monthly')}</span>
            <span className="text-xl font-black text-gray-900 tracking-tight tabular-nums">{formatCurrency(totals.monthly)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{t('annual')}</span>
            <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tighter tabular-nums">{formatCurrency(totals.annual)}</span>
          </div>
        </div>

        <div className="relative">
          <div className="flex rounded-xl overflow-hidden shadow-lg shadow-blue-200">
            <button
              type="button"
              onClick={() => exportAs('excel')}
              disabled={isExporting}
              className="flex-1 bg-blue-600 text-white py-3 font-bold hover:bg-blue-700 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>{t('export')}</span>
              <span className="text-[10px] font-bold bg-blue-700/60 px-1.5 py-0.5 rounded uppercase tracking-wider">XLSX</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              aria-label={t('exportFormat')}
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 transition-colors border-l border-blue-500"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isExportMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsExportMenuOpen(false)} />
              <div
                role="menu"
                onKeyDown={(e) => e.key === 'Escape' && setIsExportMenuOpen(false)}
                className="absolute bottom-full mb-2 right-0 w-full bg-white rounded-xl border border-gray-200 shadow-2xl z-40 overflow-hidden"
              >
                {(
                  [
                    ['excel', 'Excel (.xlsx)'],
                    ['csv', 'CSV (.csv)'],
                    ['json', 'JSON (.json)'],
                  ] as const
                ).map(([format, label], i) => (
                  <button
                    key={format}
                    type="button"
                    role="menuitem"
                    autoFocus={i === 0}
                    onClick={() => exportAs(format)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 outline-none ${
                      i > 0 ? 'border-t border-gray-100' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="mt-3 text-[10px] text-gray-400 text-center leading-snug">{t('asOf')}</p>
      </div>
    </div>
  );
}
