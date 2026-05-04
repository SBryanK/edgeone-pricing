import { useState } from 'react';
import { Building2, Activity, Sparkles, Shield, Plus, ChevronDown, ChevronRight, Search, MapPin, ExternalLink } from 'lucide-react';
import { SERVICE_ITEMS, SERVICE_CATEGORIES, REGIONS } from '../data/pricing';
import type { Region } from '../types';

interface ServiceSelectorProps {
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  onAddItem: (serviceId: string, quantity: number, region?: Region) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Plus: <Plus className="w-4 h-4" />,
};

export function ServiceSelector({ language, onAddItem }: ServiceSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('traffic');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedRegion, setSelectedRegion] = useState<Region>('chinese_mainland');
  const [search, setSearch] = useState('');

  const t = {
    title:
      language === 'zh'
        ? '服务目录'
        : language === 'kr'
        ? '서비스 카탈로그'
        : language === 'jp'
        ? 'サービスカタログ'
        : language === 'id'
        ? 'Katalog Layanan'
        : 'Service Catalog',
    search:
      language === 'zh'
        ? '搜索服务...'
        : language === 'kr'
        ? '서비스 검색...'
        : language === 'jp'
        ? 'サービスを検索...'
        : language === 'id'
        ? 'Cari layanan...'
        : 'Search services...',
    add:
      language === 'zh'
        ? '添加'
        : language === 'kr'
        ? '추가'
        : language === 'jp'
        ? '追加'
        : language === 'id'
        ? 'Tambah'
        : 'Add',
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
    quantity:
      language === 'zh'
        ? '数量'
        : language === 'kr'
        ? '수량'
        : language === 'jp'
        ? '数量'
        : language === 'id'
        ? 'Jumlah'
        : 'Quantity',
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
    docs:
      language === 'zh'
        ? '文档'
        : language === 'kr'
        ? '문서'
        : language === 'jp'
        ? 'ドキュメント'
        : language === 'id'
        ? 'Dokumen'
        : 'Docs',
  };

  const getCategoryName = (category: typeof SERVICE_CATEGORIES[number]) => {
    if (language === 'zh') return category.nameZh;
    if (language === 'kr') return category.nameKr || category.name;
    if (language === 'jp') return category.nameJp || category.name;
    if (language === 'id') return category.nameId || category.name;
    return category.name;
  };

  const getServiceName = (service: typeof SERVICE_ITEMS[number]) => {
    if (language === 'zh') return service.nameZh;
    if (language === 'kr') return service.nameKr || service.name;
    if (language === 'jp') return service.nameJp || service.name;
    if (language === 'id') return service.nameId || service.name;
    return service.name;
  };

  const getServiceDescription = (service: typeof SERVICE_ITEMS[number]) => {
    if (language === 'id') return service.descriptionId || service.description;
    return service.description;
  };

  const getServiceUnit = (service: typeof SERVICE_ITEMS[number]) => {
    if (language === 'zh') return service.unitZh;
    if (language === 'kr') return service.unitKr || service.unit;
    if (language === 'jp') return service.unitJp || service.unit;
    if (language === 'id') return service.unitId || service.unit;
    return service.unit;
  };

  const getRegionName = (region: typeof REGIONS[number]) => {
    if (language === 'zh') return region.nameZh;
    if (language === 'kr') return region.nameKr || region.name;
    if (language === 'jp') return region.nameJp || region.name;
    if (language === 'id') return region.nameId || region.name;
    return region.name;
  };

  const handleAddService = () => {
    if (selectedService) {
      const service = SERVICE_ITEMS.find((s) => s.id === selectedService);
      if (service?.hasRegionalPricing) {
        onAddItem(selectedService, quantity, selectedRegion);
      } else {
        onAddItem(selectedService, quantity);
      }
      setSelectedService(null);
      setQuantity(1);
    }
  };

  const filteredCategories = SERVICE_CATEGORIES.map(cat => ({
    ...cat,
    items: SERVICE_ITEMS.filter(s => 
      s.category === cat.id && 
      (getServiceName(s).toLowerCase().includes(search.toLowerCase()) ||
       s.name.toLowerCase().includes(search.toLowerCase()) ||
       s.nameZh.includes(search) ||
       (s.nameKr || '').includes(search) ||
       (s.nameJp || '').includes(search) ||
       (s.nameId || '').toLowerCase().includes(search.toLowerCase()))
    )
  })).filter(cat => cat.items.length > 0);

  const selectedServiceData = SERVICE_ITEMS.find((s) => s.id === selectedService);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full lg:w-80 flex-shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{t.title}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder={t.search} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none" 
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredCategories.map((category) => (
          <div key={category.id} className="mb-2">
            {!search && (
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 uppercase tracking-wider"
              >
                <div className="flex items-center space-x-2">
                  {iconMap[category.icon]}
                  <span>
                    {getCategoryName(category)}
                  </span>
                </div>
                {expandedCategory === category.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}

            {(search || expandedCategory === category.id) && (
              <div className="space-y-1 mt-1">
                {category.items.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-blue-50 hover:text-blue-700 group transition-colors flex items-start justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                        {getServiceName(service)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                        {getServiceDescription(service)}
                      </div>
                    </div>
                    {service.hasRegionalPricing && (
                      <MapPin className="w-3 h-3 text-gray-300 group-hover:text-blue-400 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedService && selectedServiceData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {getServiceName(selectedServiceData)}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{getServiceDescription(selectedServiceData)}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">{t.quantity}</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                  <span className="text-sm text-gray-500">
                    {getServiceUnit(selectedServiceData)}
                  </span>
                </div>
              </div>

              {selectedServiceData.hasRegionalPricing && (
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    <span>{t.region}</span>
                    <a
                      href="https://edgeone.ai/document/55640"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 normal-case hover:underline"
                    >
                      {t.docs} <ExternalLink className="w-3 h-3" />
                    </a>
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value as Region)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {getRegionName(region)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setSelectedService(null);
                  setQuantity(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleAddService}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
