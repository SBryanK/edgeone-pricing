import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus, Check, GripVertical, ChevronDown, ExternalLink } from 'lucide-react';
import { SERVICE_ITEMS, REGIONS, SERVICE_CATEGORIES } from '../data/pricing';
import type { Region } from '../types';

interface ServiceCatalogProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  onAddItem: (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: 'GB' | 'TB' | 'PB') => void;
}

const UNIT_MULTIPLIERS: Record<string, number> = {
  'GB': 1,
  'TB': 1000,
  'PB': 1000000,
};

// Helper to get localized text
function getLocalizedText(language: string, text: { en: string, zh: string, kr: string, jp: string, id: string }) {
  if (language === 'zh') return text.zh;
  if (language === 'kr') return text.kr;
  if (language === 'jp') return text.jp;
  if (language === 'id') return text.id;
  return text.en;
}

interface ServiceInput {
  quantity: number;
  region: Region;
  displayUnit?: 'GB' | 'TB' | 'PB';
}

interface DraggableServiceCardProps {
  service: typeof SERVICE_ITEMS[0];
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  onAdd: () => void;
  input: ServiceInput;
  onUpdate: (field: 'quantity' | 'region' | 'displayUnit', value: number | string) => void;
  isAdded: boolean;
  t: Record<string, { en: string; zh: string; kr: string; jp: string; id: string }>;
}

// Draggable Item Component
function DraggableServiceCard({ service, language, onAdd, input, onUpdate, isAdded, t }: DraggableServiceCardProps) {
  const isGBUnit = service.unit.includes('GB');

  let serviceName = service.name;
  if (language === 'zh') serviceName = service.nameZh;
  if (language === 'kr') serviceName = service.nameKr || service.name;
  if (language === 'jp') serviceName = service.nameJp || service.name;
  if (language === 'id') serviceName = service.nameId || service.name;

  let serviceUnit = service.unit;
  if (language === 'zh') serviceUnit = service.unitZh;
  if (language === 'kr') serviceUnit = service.unitKr || service.unit;
  if (language === 'jp') serviceUnit = service.unitJp || service.unit;
  if (language === 'id') serviceUnit = service.unitId || service.unit;

  let serviceDescription = service.description;
  if (language === 'id') serviceDescription = service.descriptionId || service.description;
  
  // Calculate real quantity for drag data
  let finalQuantity = input.quantity;
  if (service.unit.includes('GB') && input.displayUnit) {
    finalQuantity = input.quantity * (UNIT_MULTIPLIERS[input.displayUnit] || 1);
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `service-${service.id}`,
    data: {
      type: 'add-service',
      serviceId: service.id,
      quantity: finalQuantity,
      region: service.hasRegionalPricing ? input.region : undefined,
      displayUnit: input.displayUnit,
      name: serviceName // For overlay
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
    opacity: 0.8,
    touchAction: 'none', // Critical for mobile dragging
  } : undefined;

  // A few services are fixed-quantity because they are billed per flat bundle
  // (e.g. plan subscriptions, monthly DDoS instance fees). However, DDoS
  // overage items (traffic, hourly proxy, resource) are still quantity-based.
  const FIXED_QTY_IDS = new Set([
    'plan_personal',
    'plan_basic',
    'plan_standard',
    'enterprise_postpaid',
    'enterprise_prepaid',
    'ddos_essential',
    'ddos_premium',
    'ddos_china_extension',
    'advanced_web_protection',
  ]);
  const isFixedQuantity = FIXED_QTY_IDS.has(service.id);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white p-5 rounded-lg border transition-all duration-200 hover:shadow-md relative group ${
        isAdded ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 hover:border-blue-300'
      } ${isDragging ? 'shadow-xl rotate-2 cursor-grabbing' : 'cursor-default'}`}
    >
      {/* Drag Handle Indicator */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-3 right-3 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500 p-2 -m-2 z-10"
      >
          <GripVertical className="w-5 h-5" />
      </div>

      {/* Header Section: Title & Description */}
      <div className="min-w-0 mb-2">
        <h3 className="text-lg font-bold text-gray-900 break-words whitespace-normal leading-tight line-clamp-2" title={serviceName}>
          {serviceName}
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 break-words leading-relaxed" title={serviceDescription}>
          {serviceDescription}
        </p>
      </div>

      {/* Price Section - Positioned responsive: below description on mobile, side-aligned conceptually on larger containers */}
      {service.basePrice !== undefined && (
        <div className="mt-3 md:mt-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              ${service.basePrice}
              <span className="text-sm text-gray-400 font-medium ml-1">{serviceUnit}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Section */}
      <div className="space-y-4 mt-auto overflow-hidden">
        {/* Region Select (if applicable) */}
        {service.hasRegionalPricing && (
          <div className="min-w-0">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              <span>{getLocalizedText(language, t.region)}</span>
              <a
                href="https://edgeone.ai/document/55640"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 normal-case hover:underline"
                title="EdgeOne Region Docs"
              >
                {getLocalizedText(language, t.docs)} <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <select
              value={input.region}
              onChange={(e) => onUpdate('region', e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-shadow"
            >
              {REGIONS.map(r => {
                let rName = r.name;
                if (language === 'zh') rName = r.nameZh;
                if (language === 'kr') rName = r.nameKr || r.name;
                if (language === 'jp') rName = r.nameJp || r.name;
                if (language === 'id') rName = r.nameId || r.name;
                return (
                  <option key={r.id} value={r.id}>
                    {rName}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Quantity Input */}
        {!isFixedQuantity && (
          <div className="min-w-0">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 truncate">
              {getLocalizedText(language, t.quantity)}
            </label>
            <div className="flex rounded-lg shadow-sm overflow-hidden border border-gray-300 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                type="number"
                min="0"
                value={input.quantity}
                onChange={(e) => onUpdate('quantity', Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 min-w-0 block w-full px-3 py-2 text-sm border-none focus:ring-0"
              />
              {isGBUnit ? (
                <div className="relative shrink-0">
                  <select
                      value={input.displayUnit}
                      onChange={(e) => onUpdate('displayUnit', e.target.value)}
                      className="appearance-none h-full pl-3 pr-8 bg-gray-50 text-gray-600 text-xs font-bold border-l border-gray-300 focus:outline-none"
                  >
                      <option value="GB">GB</option>
                      <option value="TB">TB</option>
                      <option value="PB">PB</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              ) : (
                <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-xs font-bold border-l border-gray-300">
                  {serviceUnit}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Add Button */}
        <button
          onClick={onAdd}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-sm ${
            isAdded
              ? 'bg-green-600 text-white shadow-green-100'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
          }`}
        >
          {isAdded ? (
            <div className="flex items-center space-x-2 min-w-0">
              <Check className="w-5 h-5 shrink-0" />
              <span className="truncate">{getLocalizedText(language, t.added)}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 min-w-0">
              <Plus className="w-5 h-5 shrink-0" />
              <span className="truncate">{getLocalizedText(language, t.add)}</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export function ServiceCatalog({ language, onAddItem }: ServiceCatalogProps) {
  const [activeTab, setActiveTab] = useState('traffic');
  const [localInputs, setLocalInputs] = useState<Record<string, { quantity: number; region: Region; displayUnit?: 'GB' | 'TB' | 'PB' }>>({});
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const t = {
    region: { en: 'Region', zh: '区域', kr: '지역', jp: '地域', id: 'Wilayah' },
    quantity: { en: 'Quantity', zh: '数量', kr: '수량', jp: '数量', id: 'Jumlah' },
    add: { en: 'Add to Estimate', zh: '加入估算', kr: '견적에 추가', jp: '見積もりに追加', id: 'Tambah ke Estimasi' },
    added: { en: 'Added', zh: '已添加', kr: '추가됨', jp: '追加済み', id: 'Sudah ditambahkan' },
    docs: { en: 'Docs', zh: '文档', kr: '문서', jp: 'ドキュメント', id: 'Dokumen' },
  };

  const getInput = (id: string, defaultUnit?: 'GB' | 'TB' | 'PB') => {
    const stored = localInputs[id];
    return {
      quantity: stored?.quantity ?? 1,
      region: stored?.region ?? 'chinese_mainland',
      displayUnit: stored?.displayUnit ?? defaultUnit,
    };
  };

  const handleUpdate = (id: string, field: 'quantity' | 'region' | 'displayUnit', value: number | string) => {
    setLocalInputs(prev => ({
      ...prev,
      [id]: { ...getInput(id), [field]: value }
    }));
  };

  const handleAdd = (service: typeof SERVICE_ITEMS[0]) => {
    const input = getInput(service.id, service.unit.includes('GB') ? 'GB' : undefined);
    let finalQuantity = input.quantity;
    if (service.unit.includes('GB') && input.displayUnit) {
      finalQuantity = input.quantity * (UNIT_MULTIPLIERS[input.displayUnit] || 1);
    }
    onAddItem(
      service.id, 
      finalQuantity, 
      service.hasRegionalPricing ? input.region : undefined, 
      undefined, 
      input.displayUnit
    );
    setAddedFeedback(service.id);
    setTimeout(() => setAddedFeedback(null), 1500);
  };

  const categories = SERVICE_CATEGORIES;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide shrink-0">
        {categories.map(cat => {
          let name = cat.name;
          if (language === 'zh') name = cat.nameZh;
          if (language === 'kr') name = cat.nameKr || cat.name;
          if (language === 'jp') name = cat.nameJp || cat.name;
          if (language === 'id') name = cat.nameId || cat.name;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === cat.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {SERVICE_ITEMS.filter(s => s.category === activeTab).map(service => (
            <DraggableServiceCard
              key={service.id}
              service={service}
              language={language}
              onAdd={() => handleAdd(service)}
              input={getInput(service.id, service.unit.includes('GB') ? 'GB' : undefined)}
              onUpdate={(field: 'quantity' | 'region' | 'displayUnit', val: number | string) => handleUpdate(service.id, field, val)}
              isAdded={addedFeedback === service.id}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
