import { X } from 'lucide-react';
import { REGIONS } from '../data/pricing';

interface RegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

export function RegionModal({ isOpen, onClose, language }: RegionModalProps) {
  if (!isOpen) return null;

  const t = {
    title: {
      en: 'Region Definitions',
      zh: '区域说明',
      kr: '지역 안내',
      jp: '地域の説明',
      id: 'Definisi Wilayah',
    }[language],
    region: {
      en: 'Region',
      zh: '区域',
      kr: '지역',
      jp: '地域',
      id: 'Wilayah',
    }[language],
    description: {
      en: 'Included Areas',
      zh: '覆盖地区',
      kr: '포함 지역',
      jp: '対象地域',
      id: 'Cakupan Wilayah',
    }[language],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs sticky top-0">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">{t.region}</th>
                <th className="px-4 py-3 rounded-tr-lg">{t.description}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {REGIONS.map((region) => {
                let name = region.name;
                if (language === 'zh') name = region.nameZh;
                if (language === 'kr') name = region.nameKr || region.name;
                if (language === 'jp') name = region.nameJp || region.name;
                if (language === 'id') name = region.nameId || region.name;
                let description = region.description;
                if (language === 'zh') description = region.descriptionZh;
                if (language === 'kr') description = region.descriptionKr;
                if (language === 'jp') description = region.descriptionJp;
                if (language === 'id') description = region.descriptionId;

                return (
                  <tr key={region.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-gray-600">{description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
