import { useState, useEffect } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { ChevronDown, X, Merge, Percent } from 'lucide-react';
import type { CalculatorInput, CalculatedItem } from '../types';
import type { Draft } from '../hooks/useCalculator';
import { formatCurrency } from '../utils/calculator';
import { SERVICE_ITEMS } from '../data/pricing';

interface CompareEstimatePaneProps {
  draft: Draft;
  calculatedItems: CalculatedItem[];
  totals: { monthly: number; annual: number };
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  paneIndex: number;
  allDrafts: Draft[];
  isCompact?: boolean;
  onChangeDraft: (paneIndex: number, draftId: string) => void;
  onRemovePane: (paneIndex: number) => void;
  onMergePane: (sourcePaneIndex: number, targetPaneIndex: number) => void;
  onUpdateItem: (draftId: string, index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (draftId: string, index: number) => void;
  onSetGlobalDiscount: (draftId: string, discount: number) => void;
  canRemove: boolean;
  otherPaneIndices: number[];
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

// Draggable Item for Compare View
function DraggableCompareItem({
  item,
  inputItem,
  index,
  draftId,
  paneIndex,
  onUpdateItem,
  onRemoveItem,
}: {
  item: CalculatedItem;
  inputItem: CalculatorInput;
  index: number;
  draftId: string;
  paneIndex: number;
  onUpdateItem: (draftId: string, index: number, updates: Partial<CalculatorInput>) => void;
  onRemoveItem: (draftId: string, index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `compare-item-${draftId}-${index}`,
    data: {
      type: 'move-between-drafts',
      index,
      sourceDraftId: draftId,
      sourcePaneIndex: paneIndex,
      item: inputItem
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
    opacity: 0.8,
  } : undefined;

  const displayUnit = inputItem.displayUnit;
  const displayMultiplier = displayUnit ? (UNIT_MULTIPLIERS[displayUnit] || 1) : 1;
  const displayQuantity = inputItem.quantity / displayMultiplier;
  const hasDiscount = item.discount > 0;
  
  const service = SERVICE_ITEMS.find(s => s.id === item.serviceId);
  const isFixedQuantity = service?.category === 'plans' || service?.category === 'ddos';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-2 sm:p-3 rounded-lg border border-gray-200 mb-2 hover:border-blue-300 hover:shadow-sm transition-all group relative min-w-0 overflow-hidden ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      {/* Drag Handle Overlay */}
      <div 
         {...attributes} 
         {...listeners}
         className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      ></div>

      <div className="flex flex-col gap-1 relative z-10 pointer-events-none min-w-0">
        <div className="pr-6 min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 break-words whitespace-normal line-clamp-2 leading-snug" title={item.serviceName}>
            {item.serviceName}
          </h4>
          {item.regionName && (
            <span className="inline-block mt-1 px-1 py-0.5 rounded bg-blue-50 text-[8px] sm:text-[9px] font-bold text-blue-600 border border-blue-100 truncate max-w-full">
              {item.regionName}
            </span>
          )}
        </div>
        <div className="text-right">
          {hasDiscount && (
            <div className="text-[9px] sm:text-[10px] text-gray-400 line-through truncate">
              {formatCurrency(item.listPrice)}
            </div>
          )}
          <div className="text-xs sm:text-sm font-bold text-gray-900 truncate" title={formatCurrency(item.finalPrice)}>
            {formatCurrency(item.finalPrice)}
          </div>
        </div>

        {/* Remove Item Button */}
        <button 
          onClick={() => onRemoveItem(draftId, index)}
          className="absolute top-0 right-[-4px] -mt-1 text-gray-300 hover:text-red-500 transition-colors p-1 pointer-events-auto"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="mt-1 sm:mt-2 flex flex-wrap justify-between items-center text-[9px] sm:text-[10px] text-gray-500 gap-1 relative z-10 pointer-events-auto min-w-0">
        
         {/* Quantity Selector */}
         {isFixedQuantity ? (
            <span className="truncate bg-gray-50 px-1 py-0.5 rounded border border-gray-100 min-w-0 flex-shrink">{displayQuantity} {item.unit}</span>
          ) : (
            <div className="flex items-center bg-gray-50 rounded p-0.5 border border-gray-100 shrink-0 min-w-0 max-w-full">
              <NumberInput
                value={displayQuantity}
                onChange={(val) => onUpdateItem(draftId, index, { quantity: val * displayMultiplier })}
                min={0}
                className="w-8 sm:w-12 text-[10px] font-bold text-gray-900 bg-transparent text-center focus:outline-none min-w-0"
              />
              {displayUnit ? (
                <div className="relative shrink-0">
                  <select
                      value={displayUnit}
                      onChange={(e) => onUpdateItem(draftId, index, { displayUnit: e.target.value as 'GB' | 'TB' | 'PB' })}
                      className="appearance-none h-full pl-1 pr-3 bg-transparent text-gray-500 text-[9px] font-bold focus:outline-none"
                  >
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                      <option value="PB">PB</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-400">
                      <ChevronDown className="h-2 w-2" />
                  </div>
                </div>
              ) : (
                  <span className="text-[9px] font-bold text-gray-400 px-1 border-l border-gray-200 shrink-0">{item.unit}</span>
              )}
            </div>
          )}

        {/* Item Discount Input */}
        <div className={`flex items-center space-x-1 px-1 py-0.5 rounded border transition-colors shrink-0 min-w-0 ${hasDiscount ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
            <NumberInput
                value={inputItem.discount}
                onChange={(val) => onUpdateItem(draftId, index, { discount: val })}
                min={0}
                max={100}
                className={`w-5 text-[10px] font-bold text-right outline-none bg-transparent min-w-0 ${hasDiscount ? 'text-green-600' : 'text-gray-500'}`}
            />
            <span className={`text-[9px] font-bold ${hasDiscount ? 'text-green-600' : 'text-gray-400'}`}>%</span>
        </div>
      </div>
    </div>
  );
}

export function CompareEstimatePane({
  draft,
  calculatedItems,
  totals,
  language,
  paneIndex,
  allDrafts,
  onChangeDraft,
  onRemovePane,
  onMergePane,
  onUpdateItem,
  onRemoveItem,
  onSetGlobalDiscount,
  canRemove,
  otherPaneIndices,
  isCompact = false,
}: CompareEstimatePaneProps) {
  const [showDraftSelector, setShowDraftSelector] = useState(false);
  const [showMergeMenu, setShowMergeMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `compare-pane-${paneIndex}`,
    data: {
      type: 'compare-pane',
      paneIndex,
      draftId: draft.id
    }
  });

  const t = {
    monthly: { en: 'Monthly', zh: '月度', kr: '월간', jp: '月額', id: 'Bulanan' }[language],
    annual: { en: 'Annual', zh: '年度', kr: '연간', jp: '年額', id: 'Tahunan' }[language],
    items: { en: 'items', zh: '项', kr: '항목', jp: '件', id: 'item' }[language],
    empty: { en: 'No items', zh: '暂无项目', kr: '항목 없음', jp: '項目なし', id: 'Belum ada item' }[language],
    mergeTo: { en: 'Merge to', zh: '合并到', kr: '병합', jp: '統合先', id: 'Gabungkan ke' }[language],
    dropHere: { en: 'Drop here to add', zh: '拖放添加', kr: '여기에 놓기', jp: 'ここにドロップ', id: 'Lepas di sini untuk menambahkannya' }[language],
    globalDiscount: { en: 'Global Discount', zh: '全局折扣', kr: '전체 할인', jp: '全体割引', id: 'Diskon Global' }[language],
    pane: { en: 'Pane', zh: '面板', kr: '패널', jp: 'パネル', id: 'Panel' }[language],
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col ${isCompact ? 'h-auto' : 'h-full'} bg-white transition-all min-w-0 ${
        isOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : ''
      }`}
    >
      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-gray-200 bg-gray-50/80 shrink-0 min-w-0 relative z-20">
        <div className="flex items-center justify-between mb-1 sm:mb-2 gap-1 min-w-0">
          {/* Draft Selector */}
          <div className="relative min-w-0 flex-1">
            <button
              onClick={() => setShowDraftSelector(!showDraftSelector)}
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-white border border-gray-200 hover:border-blue-400 transition-colors max-w-full min-w-0"
            >
              <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate flex-1 min-w-0">{draft.name}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {showDraftSelector && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {allDrafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onChangeDraft(paneIndex, d.id);
                      setShowDraftSelector(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      d.id === draft.id ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center shrink-0 ml-auto">
            {/* Merge Button */}
            {otherPaneIndices.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowMergeMenu(!showMergeMenu)}
                  className="p-1 sm:p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                  title={t.mergeTo}
                >
                  <Merge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {showMergeMenu && (
                  <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                      {t.mergeTo}
                    </div>
                    {otherPaneIndices.map((targetIndex) => (
                      <button
                        key={targetIndex}
                        onClick={() => {
                          onMergePane(paneIndex, targetIndex);
                          setShowMergeMenu(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {t.pane} {targetIndex + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Remove Pane Button */}
            {canRemove && (
              <button
                onClick={() => onRemovePane(paneIndex)}
                className="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats & Global Discount */}
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-gray-500 gap-1 min-w-0">
          <span className="font-semibold shrink-0 truncate max-w-[40%]">{calculatedItems.length} {t.items}</span>
          
          <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded px-1 sm:px-1.5 py-0.5 max-w-[55%] shrink-0 min-w-0">
             <Percent className="w-2.5 h-2.5 text-gray-400 shrink-0" />
             <NumberInput
                value={draft.globalDiscount}
                onChange={(val) => onSetGlobalDiscount(draft.id, val)}
                min={0}
                max={100}
                className="w-5 sm:w-6 text-[9px] font-bold text-gray-700 text-right outline-none bg-transparent min-w-0"
             />
             <span className="text-[9px] font-bold text-gray-400 shrink-0">%</span>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className={`${isCompact ? 'p-2 sm:p-3 bg-gray-50/30' : 'flex-1 overflow-y-auto p-2 sm:p-3 bg-gray-50/30 min-h-0'}`}>
        {calculatedItems.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
            isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}>
            <span className="text-gray-400 text-xs sm:text-sm text-center px-2">{isOver ? t.dropHere : t.empty}</span>
          </div>
        ) : (
          calculatedItems.map((item, index) => (
            <DraggableCompareItem
              key={`${draft.id}-${index}`}
              item={item}
              inputItem={draft.items[index]}
              index={index}
              draftId={draft.id}
              paneIndex={paneIndex}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Footer - Totals */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-white shrink-0">
        <div className="flex justify-between items-baseline mb-2 gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest shrink-0">{t.monthly}</span>
          <span
            className="text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate"
            title={formatCurrency(totals.monthly)}
          >
            {formatCurrency(totals.monthly)}
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-3 border-t border-gray-100 gap-2">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest shrink-0">{t.annual}</span>
          <span
            className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tighter truncate"
            title={formatCurrency(totals.annual)}
          >
            {formatCurrency(totals.annual)}
          </span>
        </div>
      </div>
    </div>
  );
}
