import { useState, useEffect } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Trash2, Percent, Download, Tag, ChevronDown } from 'lucide-react';
import type { CalculatorInput, CalculatedItem } from '../types';
import {
  formatCurrency
} from '../utils/calculator';
import { SERVICE_ITEMS } from '../data/pricing';

interface EstimateSlipProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  items: CalculatorInput[];
  calculatedItems: CalculatedItem[];
  totals: { monthly: number; annual: number };
  globalDiscount: number;
  onUpdateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (index: number) => void;
  onGlobalDiscountChange: (discount: number) => void;
  onExport: (format: 'csv' | 'json' | 'excel') => void;
  onDraftDrop?: (draftId: string) => void;
  discountMode?: 'global' | 'item';
  onDiscountModeChange?: (mode: 'global' | 'item') => void;
}

const UNIT_MULTIPLIERS: Record<string, number> = {
  'GB': 1,
  'TB': 1000,
  'PB': 1000000,
};

function NumberInput({ 
  value, 
  onChange, 
  className, 
  min = 0, 
  max,
  placeholder,
  disabled
}: { 
  value: number; 
  onChange: (val: number) => void; 
  className?: string; 
  min?: number; 
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [strVal, setStrVal] = useState(value.toString());

  useEffect(() => {
    setStrVal(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    
    // Prevent invalid characters
    if (!/^\d*\.?\d*$/.test(newVal)) return;

    setStrVal(newVal); 
    
    if (newVal === '') {
      onChange(0); 
      return; 
    }

    let num = parseFloat(newVal);
    
    // Strict limits logic
    if (isNaN(num)) return;
    if (max !== undefined && num > max) num = max;
    if (min !== undefined && num < min) num = min; 

    onChange(num);
  };

  const handleBlur = () => {
    if (strVal === '' || isNaN(parseFloat(strVal))) {
      setStrVal(min.toString());
      onChange(min);
    } else {
      const num = parseFloat(strVal);
      // Remove leading zeros or format
      setStrVal(num.toString());
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={strVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`${className} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

interface DraggableEstimateItemProps {
  item: CalculatedItem;
  inputItem: CalculatorInput;
  index: number;
  onUpdateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (index: number) => void;
  discountMode: 'global' | 'item';
  t: Record<string, string | undefined>;
}

// Draggable Item Component
function DraggableEstimateItem({ item, inputItem, index, onUpdateItem, onRemoveItem, discountMode, t }: DraggableEstimateItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${index}`,
    data: { type: 'remove-item', index }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
    opacity: 0.8,
    touchAction: 'none',
  } : undefined;

  const hasItemDiscount = item.discount > 0;
  const service = SERVICE_ITEMS.find(s => s.id === item.serviceId);
  const isFixedQuantity = service?.category === 'plans' || service?.category === 'ddos';
  
  const displayUnit = inputItem.displayUnit;
  const displayMultiplier = displayUnit ? (UNIT_MULTIPLIERS[displayUnit] || 1) : 1;
  const displayQuantity = inputItem.quantity / displayMultiplier;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group hover:border-blue-400 hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Drag Handle Overlay */}
      <div 
         {...attributes} 
         {...listeners}
         className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      ></div>

      {/* Content Layer (pointer-events-none for background, auto for interactive elements) */}
      <div className="relative z-10 pointer-events-none">
        {/* Delete Button */}
        <button 
          onClick={() => onRemoveItem(index)}
          className="absolute top-0 right-0 text-gray-300 hover:text-red-500 transition-colors p-1 pointer-events-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="pr-8 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 leading-tight break-words whitespace-normal">
            {item.serviceName}
          </h4>
          {item.regionName && (
            <div className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase tracking-wider break-words max-w-full">
              {item.regionName}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col space-y-3 relative z-10 pointer-events-auto">
        {/* Price Breakdown */}
        <div className="text-right">
          {hasItemDiscount && (
            <div className="text-[10px] text-gray-400 line-through decoration-red-400/50 decoration-1 font-medium">
              {formatCurrency(item.listPrice)}
            </div>
          )}
          <div className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
            {formatCurrency(item.finalPrice)}
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="min-w-0">
          {isFixedQuantity ? (
            <div className="flex items-center bg-gray-50/50 rounded-lg p-1.5 border border-gray-100 text-xs font-medium text-gray-500">
              {inputItem.quantity} {item.unit}
            </div>
          ) : (
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
              <NumberInput
                value={displayQuantity}
                onChange={(val) => onUpdateItem(index, { quantity: val * displayMultiplier })}
                min={0}
                className="w-16 text-xs font-bold text-gray-900 bg-transparent text-center focus:outline-none"
              />
              {displayUnit ? (
                <div className="relative">
                  <select
                      value={displayUnit}
                      onChange={(e) => onUpdateItem(index, { displayUnit: e.target.value as 'GB' | 'TB' | 'PB' })}
                      className="appearance-none h-full pl-2 pr-5 bg-transparent text-gray-500 text-[10px] font-bold focus:outline-none"
                  >
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                      <option value="PB">PB</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-400">
                      <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              ) : (
                  <span className="text-[10px] font-bold text-gray-400 px-2 border-l border-gray-200">{item.unit}</span>
              )}
            </div>
          )}
        </div>

        {/* Discount Section */}
        {discountMode === 'item' && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center space-x-2">
              <Tag className={`w-3 h-3 ${hasItemDiscount ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.itemDiscount}</span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${hasItemDiscount ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
              <NumberInput
                value={inputItem.discount}
                onChange={(val) => onUpdateItem(index, { discount: val })}
                min={0}
                max={100}
                className={`w-8 text-xs font-bold text-right outline-none bg-transparent ${hasItemDiscount ? 'text-green-600' : 'text-gray-500'}`}
              />
              <span className={`text-[10px] font-bold ${hasItemDiscount ? 'text-green-600' : 'text-gray-400'}`}>%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EstimateSlip({
  language,
  items,
  calculatedItems,
  totals,
  globalDiscount,
  onUpdateItem,
  onRemoveItem,
  onGlobalDiscountChange,
  onExport,
  onDraftDrop,
  discountMode: externalDiscountMode,
  onDiscountModeChange,
}: EstimateSlipProps) {
  const [internalDiscountMode, setInternalDiscountMode] = useState<'global' | 'item'>('global');
  const [isDraftDragOver, setIsDraftDragOver] = useState(false);
  // Controls visibility of the export format dropdown (Excel / CSV / JSON).
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Use external discount mode if provided, otherwise use internal state
  const discountMode = externalDiscountMode ?? internalDiscountMode;
  const setDiscountMode = (mode: 'global' | 'item') => {
    if (onDiscountModeChange) {
      onDiscountModeChange(mode);
    } else {
      setInternalDiscountMode(mode);
    }
  };
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'estimate-slip',
  });

  const t = {
    title: {
      en: 'Cost Estimate',
      zh: '费用估算',
      kr: '비용 견적',
      jp: '見積',
      id: 'Estimasi Biaya',
    }[language],
    empty: {
      en: 'Drag services here to add',
      zh: '拖拽服务到这里添加',
      kr: '서비스를 여기로 드래그해 추가하세요',
      jp: 'サービスをここにドラッグして追加',
      id: 'Seret layanan ke sini untuk menambahkan',
    }[language],
    monthly: {
      en: 'Monthly Total',
      zh: '月度合计',
      kr: '월간 합계',
      jp: '月額合計',
      id: 'Total Bulanan',
    }[language],
    annual: {
      en: 'Annual Total',
      zh: '年度合计',
      kr: '연간 합계',
      jp: '年額合計',
      id: 'Total Tahunan',
    }[language],
    globalDiscount: {
      en: 'Global Discount',
      zh: '全局折扣',
      kr: '전체 할인',
      jp: '全体割引',
      id: 'Diskon Global',
    }[language],
    itemDiscount: {
      en: 'Item Discount',
      zh: '单项折扣',
      kr: '항목별 할인',
      jp: '個別割引',
      id: 'Diskon Item',
    }[language],
    export: {
      en: 'Export Quote',
      zh: '导出报价',
      kr: '견적서 내보내기',
      jp: '見積書をエクスポート',
      id: 'Ekspor Penawaran',
    }[language],
    mode: {
      en: 'Discount Mode',
      zh: '折扣模式',
      kr: '할인 모드',
      jp: '割引モード',
      id: 'Mode Diskon',
    }[language],
    global: {
      en: 'Global',
      zh: '全局',
      kr: '전체',
      jp: '全体',
      id: 'Global',
    }[language],
    item: {
      en: 'Item',
      zh: '单项',
      kr: '항목별',
      jp: '個別',
      id: 'Per item',
    }[language],
    dropDraft: {
      en: 'Drop Draft to Compare',
      zh: '拖放草稿进行对比',
      kr: '비교할 초안을 여기에 놓으세요',
      jp: '下書きをここにドロップして比較',
      id: 'Lepas draf untuk dibandingkan',
    }[language],
    itemsLabel: {
      en: 'items',
      zh: '项',
      kr: '항목',
      jp: '件',
      id: 'item',
    }[language],
    active: {
      en: 'ACTIVE',
      zh: '已启用',
      kr: '활성',
      jp: '有効',
      id: 'AKTIF',
    }[language],
  };

  useEffect(() => {
    if (discountMode === 'global') {
      if (globalDiscount > 0) onGlobalDiscountChange(globalDiscount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discountMode]);

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
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDraftDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!onDraftDrop || !isDraftTransfer(event)) return;
    event.preventDefault();
    setIsDraftDragOver(false);
    const draftId = event.dataTransfer.getData('application/x-edgeone-draft-tab');
    if (draftId) onDraftDrop(draftId);
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
      <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <span className="w-1 h-5 bg-blue-600 rounded-full mr-3"></span>
            {t.title}
          </h2>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {calculatedItems.length} {t.itemsLabel}
          </span>
        </div>

        {/* Discount Mode Toggle */}
        {calculatedItems.length > 0 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setDiscountMode('global')}
              className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all ${
                discountMode === 'global' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.global}
            </button>
            <button
              onClick={() => setDiscountMode('item')}
              className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all ${
                discountMode === 'item' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.item}
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 relative">
        {isDraftDragOver && (
          <div className="absolute inset-0 z-20 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center border-2 border-dashed border-blue-400 rounded-xl">
            <div className="bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-blue-700">
              {t.dropDraft}
            </div>
          </div>
        )}
        {calculatedItems.length === 0 ? (
          <div className={`text-center py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
            isOver || isDraftDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 text-gray-400'
          }`}>
             <Download className={`w-8 h-8 mb-2 ${isOver ? 'text-blue-500 animate-bounce' : 'text-gray-300'}`} />
             <p className="text-sm font-medium">{t.empty}</p>
          </div>
        ) : (
          calculatedItems.map((item, index) => (
            <DraggableEstimateItem
              key={index}
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
      <div className="p-5 border-t border-gray-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-10 shrink-0">
        {discountMode === 'global' && (
          <div className="mb-6 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.globalDiscount}</label>
              {globalDiscount > 0 && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {t.active}
                </span>
              )}
            </div>
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Percent className={`h-4 w-4 transition-colors ${globalDiscount > 0 ? 'text-green-500' : 'text-gray-400'}`} />
               </div>
               <NumberInput
                  value={globalDiscount}
                  onChange={onGlobalDiscountChange}
                  min={0}
                  max={100}
                  className={`block w-full pl-10 pr-4 py-2.5 text-sm font-bold border rounded-xl outline-none transition-all ${
                    globalDiscount > 0 
                    ? 'border-green-500 ring-2 ring-green-100 bg-green-50/10 text-green-700' 
                    : 'border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'
                  }`}
               />
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.monthly}</span>
            <span className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">{formatCurrency(totals.monthly)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-4 border-t border-gray-100">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">{t.annual}</span>
            <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tighter">{formatCurrency(totals.annual)}</span>
          </div>
        </div>

        {/* Export button with format picker.                                 */}
        {/* Clicking the main button exports as Excel (default, matches the  */}
        {/* company template). Clicking the chevron reveals CSV/JSON options. */}
        <div className="relative">
          <div className="flex rounded-xl overflow-hidden shadow-lg shadow-blue-200">
            <button
              onClick={() => onExport('excel')}
              className="flex-1 bg-blue-600 text-white py-3.5 font-bold hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>{t.export}</span>
              <span className="text-[10px] font-bold bg-blue-700/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                XLSX
              </span>
            </button>
            <button
              onClick={() => setIsExportMenuOpen((v) => !v)}
              aria-label="Choose export format"
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 transition-colors border-l border-blue-500"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {isExportMenuOpen && (
            <>
              {/* Click-away layer */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsExportMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute bottom-full mb-2 right-0 w-full bg-white rounded-xl border border-gray-200 shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-150"
              >
                <button
                  role="menuitem"
                  onClick={() => { setIsExportMenuOpen(false); onExport('excel'); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between"
                >
                  <span>Excel (.xlsx)</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Template</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setIsExportMenuOpen(false); onExport('csv'); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-t border-gray-100"
                >
                  CSV (.csv)
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setIsExportMenuOpen(false); onExport('json'); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-t border-gray-100"
                >
                  JSON (.json)
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
