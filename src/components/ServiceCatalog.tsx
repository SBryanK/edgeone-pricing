import { useMemo, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus, Check, GripVertical, ChevronDown, ExternalLink, Search, X } from 'lucide-react';
import {
  SERVICE_ITEMS,
  REGIONS,
  SERVICE_CATEGORIES,
  isFixedQuantityService,
  isVolumeInGB,
} from '../data/pricing';
import { OFFICIAL_DOCS } from '../data/sources';
import type { DisplayUnit, Language, Region, ServiceItem, TierMode } from '../types';
import {
  calculateItemPrice,
  displayMultiplier,
  formatCurrency,
  formatUnitPrice,
  getRegionName,
  getServiceDescription,
  getServiceName,
  getServiceUnit,
  tierModeLabel,
} from '../utils/calculator';
import { PriceSourceBadge } from './PriceSourceBadge';

interface ServiceCatalogProps {
  language: Language;
  onAddItem: (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: DisplayUnit) => void;
  /** Tier mode of the active draft, used for the live price preview. */
  tierMode?: TierMode;
}

type Localized = Record<Language, string>;

const T = {
  region: { en: 'Region', zh: '区域', kr: '지역', jp: '地域', id: 'Wilayah' },
  quantity: { en: 'Monthly usage', zh: '月用量', kr: '월 사용량', jp: '月間使用量', id: 'Pemakaian bulanan' },
  add: { en: 'Add to Estimate', zh: '加入估算', kr: '견적에 추가', jp: '見積もりに追加', id: 'Tambah ke Estimasi' },
  added: { en: 'Added', zh: '已添加', kr: '추가됨', jp: '追加済み', id: 'Ditambahkan' },
  docs: { en: 'Billing regions', zh: '计费区域', kr: '과금 지역', jp: '課金地域', id: 'Wilayah tagihan' },
  search: {
    en: 'Search services…',
    zh: '搜索服务…',
    kr: '서비스 검색…',
    jp: 'サービスを検索…',
    id: 'Cari layanan…',
  },
  clearSearch: { en: 'Clear search', zh: '清除搜索', kr: '검색 지우기', jp: '検索をクリア', id: 'Hapus pencarian' },
  noResults: {
    en: 'No services match your search.',
    zh: '没有匹配的服务。',
    kr: '일치하는 서비스가 없습니다.',
    jp: '一致するサービスがありません。',
    id: 'Tidak ada layanan yang cocok.',
  },
  preview: { en: 'Estimated', zh: '预估', kr: '예상', jp: '見積', id: 'Perkiraan' },
  tierReached: { en: 'tier', zh: '档位', kr: '구간', jp: '段階', id: 'tier' },
  from: { en: 'from', zh: '低至', kr: '최저', jp: '最低', id: 'mulai' },
  dragHint: {
    en: 'Drag to the estimate',
    zh: '拖到估算单',
    kr: '견적으로 드래그',
    jp: '見積もりへドラッグ',
    id: 'Seret ke estimasi',
  },
  fixed: { en: 'Flat monthly fee', zh: '固定月费', kr: '월 고정 요금', jp: '月額固定', id: 'Biaya bulanan tetap' },
} satisfies Record<string, Localized>;

interface ServiceInput {
  quantity: number;
  region: Region;
  displayUnit?: DisplayUnit;
}

const DEFAULT_REGION: Region = 'chinese_mainland';

function defaultInput(service: ServiceItem): ServiceInput {
  return {
    quantity: 1,
    region: DEFAULT_REGION,
    displayUnit: isVolumeInGB(service) ? (service.hasTieredPricing ? 'TB' : 'GB') : undefined,
  };
}

function toBaseQuantity(service: ServiceItem, input: ServiceInput): number {
  return isVolumeInGB(service) ? input.quantity * displayMultiplier(input.displayUnit) : input.quantity;
}

function tierRangeText(service: ServiceItem, region: Region, language: Language, tierMode: TierMode): string | null {
  if (!service.hasTieredPricing) return null;
  // Use a tiny and a huge volume to read the region's highest and lowest rate.
  const hi = calculateItemPrice({ serviceId: service.id, quantity: 1, region, discount: 0 }, language, tierMode);
  const lo = calculateItemPrice({ serviceId: service.id, quantity: 1e12, region, discount: 0 }, language, tierMode);
  if (!hi || !lo) return null;
  return `${formatUnitPrice(lo.unitPrice)} – ${formatUnitPrice(hi.unitPrice)}`;
}

interface CardProps {
  service: ServiceItem;
  language: Language;
  tierMode: TierMode;
  input: ServiceInput;
  isAdded: boolean;
  onUpdate: (patch: Partial<ServiceInput>) => void;
  onAdd: () => void;
}

function DraggableServiceCard({ service, language, tierMode, input, isAdded, onUpdate, onAdd }: CardProps) {
  const serviceName = getServiceName(service, language);
  const serviceUnit = getServiceUnit(service, language);
  const description = getServiceDescription(service, language);
  const isFixedQuantity = isFixedQuantityService(service.id);
  const volumeInGB = isVolumeInGB(service);
  const baseQuantity = isFixedQuantity ? 1 : toBaseQuantity(service, input);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `service-${service.id}`,
    data: {
      type: 'add-service',
      serviceId: service.id,
      quantity: baseQuantity,
      region: service.hasRegionalPricing ? input.region : undefined,
      displayUnit: volumeInGB ? input.displayUnit : undefined,
      name: serviceName,
    },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999, opacity: 0.8 }
    : undefined;

  const preview = useMemo(
    () =>
      calculateItemPrice(
        { serviceId: service.id, quantity: baseQuantity, region: input.region, discount: 0, displayUnit: input.displayUnit },
        language,
        tierMode
      ),
    [service.id, baseQuantity, input.region, input.displayUnit, language, tierMode]
  );
  const range = tierRangeText(service, input.region, language, tierMode);
  const fieldId = `svc-${service.id}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 sm:p-5 rounded-xl border flex flex-col transition-all duration-200 hover:shadow-md relative group ${
        isAdded ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200 hover:border-blue-300'
      } ${isDragging ? 'shadow-xl rotate-1 cursor-grabbing' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500 p-2 -m-2 z-10 touch-none rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label={`${T.dragHint[language]}: ${serviceName}`}
        title={T.dragHint[language]}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="min-w-0 pr-8">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <PriceSourceBadge serviceId={service.id} language={language} />
        </div>
        <h3 className="text-base font-bold text-gray-900 leading-tight break-words" title={serviceName}>
          {serviceName}
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-3 break-words leading-relaxed" title={description}>
          {description}
        </p>
      </div>

      <div className="mt-3 mb-4">
        {service.basePrice !== undefined ? (
          <div className="text-2xl font-black text-gray-900 tracking-tight">
            {formatUnitPrice(service.basePrice)}
            <span className="text-sm text-gray-400 font-medium ml-1">{serviceUnit}</span>
          </div>
        ) : range ? (
          <div className="text-lg font-black text-gray-900 tracking-tight">
            <span className="text-xs font-semibold text-gray-400 uppercase mr-1">{T.from[language]}</span>
            {range}
            <span className="text-sm text-gray-400 font-medium ml-1">{serviceUnit}</span>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 mt-auto">
        {service.hasRegionalPricing && (
          <div className="min-w-0">
            <label htmlFor={`${fieldId}-region`} className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              <span>{T.region[language]}</span>
              <a
                href={OFFICIAL_DOCS.outOfPlan}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 normal-case hover:underline"
              >
                {T.docs[language]} <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <select
              id={`${fieldId}-region`}
              value={input.region}
              onChange={(e) => onUpdate({ region: e.target.value as Region })}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {getRegionName(r.id, language)}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFixedQuantity ? (
          <div className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">{T.fixed[language]}</div>
        ) : (
          <div className="min-w-0">
            <label htmlFor={`${fieldId}-qty`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 truncate">
              {T.quantity[language]}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                id={`${fieldId}-qty`}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={Number.isFinite(input.quantity) ? input.quantity : 0}
                onChange={(e) => onUpdate({ quantity: Math.max(0, parseFloat(e.target.value) || 0) })}
                onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                className="flex-1 min-w-0 block w-full px-3 py-2 text-sm border-none outline-none"
              />
              {volumeInGB ? (
                <div className="relative shrink-0">
                  <select
                    value={input.displayUnit}
                    onChange={(e) => onUpdate({ displayUnit: e.target.value as DisplayUnit })}
                    aria-label="Unit"
                    className="appearance-none h-full pl-3 pr-7 bg-gray-50 text-gray-700 text-xs font-bold border-l border-gray-300 outline-none"
                  >
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                    <option value="PB">PB</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                </div>
              ) : (
                <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-xs font-bold border-l border-gray-300 whitespace-nowrap">
                  {serviceUnit.replace(/^\//, '')}
                </span>
              )}
            </div>
          </div>
        )}

        {preview && baseQuantity > 0 && (
          <div className="flex items-baseline justify-between text-xs bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
            <span className="text-blue-700 font-semibold">
              {T.preview[language]}
              {preview.tierLabel && (
                <span className="font-normal text-blue-600/80">
                  {' '}
                  · {T.tierReached[language]} {preview.tierLabel} · {tierModeLabel(tierMode)}
                </span>
              )}
            </span>
            <span className="font-black text-blue-800 tabular-nums">{formatCurrency(preview.listPrice)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onAdd}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
            isAdded ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAdded ? <Check className="w-5 h-5 shrink-0" /> : <Plus className="w-5 h-5 shrink-0" />}
          <span className="truncate">{isAdded ? T.added[language] : T.add[language]}</span>
        </button>
      </div>
    </div>
  );
}

function matchesQuery(service: ServiceItem, q: string): boolean {
  const hay = [
    service.id,
    service.name,
    service.nameZh,
    service.nameKr,
    service.nameJp,
    service.nameId,
    service.description,
    service.descriptionId,
  ]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function ServiceCatalog({ language, onAddItem, tierMode = 'attained' }: ServiceCatalogProps) {
  const [activeTab, setActiveTab] = useState('traffic');
  const [query, setQuery] = useState('');
  const [localInputs, setLocalInputs] = useState<Record<string, ServiceInput>>({});
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInput = (service: ServiceItem): ServiceInput => localInputs[service.id] ?? defaultInput(service);

  const handleUpdate = (service: ServiceItem, patch: Partial<ServiceInput>) => {
    setLocalInputs((prev) => ({ ...prev, [service.id]: { ...(prev[service.id] ?? defaultInput(service)), ...patch } }));
  };

  const handleAdd = (service: ServiceItem) => {
    const input = getInput(service);
    const quantity = isFixedQuantityService(service.id) ? 1 : toBaseQuantity(service, input);
    onAddItem(
      service.id,
      quantity,
      service.hasRegionalPricing ? input.region : undefined,
      undefined,
      isVolumeInGB(service) ? input.displayUnit : undefined
    );
    setAddedFeedback(service.id);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setAddedFeedback(null), 1500);
  };

  const trimmed = query.trim();
  const visibleServices = trimmed
    ? SERVICE_ITEMS.filter((s) => matchesQuery(s, trimmed))
    : SERVICE_ITEMS.filter((s) => s.category === activeTab);

  const categoryName = (cat: (typeof SERVICE_CATEGORIES)[number]) =>
    ({ en: cat.name, zh: cat.nameZh, kr: cat.nameKr, jp: cat.nameJp, id: cat.nameId })[language] || cat.name;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.search[language]}
            aria-label={T.search[language]}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={T.clearSearch[language]}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!trimmed && (
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide shrink-0" role="tablist">
          {SERVICE_CATEGORIES.map((cat) => {
            const count = SERVICE_ITEMS.filter((s) => s.category === cat.id).length;
            const active = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 sm:px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  active ? 'border-blue-600 text-blue-600 bg-blue-50/40' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {categoryName(cat)}
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-100' : 'bg-gray-100'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Container query: the catalog is also rendered in the narrow compare-mode pane. */}
      <div className="@container p-3 sm:p-5 overflow-y-auto flex-1 bg-gray-50/50" role="tabpanel">
        {visibleServices.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">{T.noResults[language]}</p>
        ) : (
          <div className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
            {visibleServices.map((service) => (
              <DraggableServiceCard
                key={service.id}
                service={service}
                language={language}
                tierMode={tierMode}
                input={getInput(service)}
                isAdded={addedFeedback === service.id}
                onUpdate={(patch) => handleUpdate(service, patch)}
                onAdd={() => handleAdd(service)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
