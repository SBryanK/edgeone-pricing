export type Region =
  | 'chinese_mainland'
  | 'north_america'
  | 'europe'
  | 'asia_pacific_1'
  | 'asia_pacific_2'
  | 'asia_pacific_3'
  | 'middle_east'
  | 'africa'
  | 'south_america';

export type Language = 'en' | 'zh' | 'kr' | 'jp' | 'id';

export type TrafficTier =
  | '0-2TB'
  | '2-10TB'
  | '10-50TB'
  | '50-100TB'
  | '100-500TB'
  | '500-1000TB'
  | '1000TB+';

export interface RegionInfo {
  id: Region;
  name: string;
  nameZh: string;
  nameKr: string;
  nameJp: string;
  nameId: string;
  description: string;
  descriptionZh: string;
  descriptionKr: string;
  descriptionJp: string;
  descriptionId: string;
}

export interface TieredPrice {
  tier: TrafficTier;
  minGB: number;
  maxGB: number;
  pricePerGB: number;
}

export interface RegionalPricing {
  region: Region;
  tiers: TieredPrice[];
}

export interface PlanInfo {
  id: string;
  name: string;
  nameZh: string;
  nameKr: string;
  nameJp: string;
  nameId: string;
  monthlyPrice: number;
  trafficGB: number | 'unlimited' | 'on-demand';
  requestsMillions: number | 'unlimited' | 'on-demand';
  sites: number;
  subdomains: number;
  features: string[];
  isEnterprise?: boolean;
}

export interface ServiceItem {
  id: string;
  category: string;
  name: string;
  nameZh: string;
  nameKr: string;
  nameJp: string;
  nameId: string;
  description: string;
  descriptionId: string;
  unit: string;
  unitZh: string;
  unitKr: string;
  unitJp: string;
  unitId: string;
  basePrice?: number;
  hasRegionalPricing?: boolean;
  hasTieredPricing?: boolean;
  // `pricingType` distinguishes between billing models that reuse the same
  // regional+tiered structure but charge different units (traffic in GB vs
  // bandwidth in Mbps). Defaults to 'traffic' when unset.
  pricingType?: 'traffic' | 'bandwidth';
  isMonthly?: boolean;
  isRequired?: boolean;
}

export interface CalculatorInput {
  serviceId: string;
  quantity: number;
  region?: Region;
  discount: number; // This is the actual discount percentage (e.g., 5 means 5% off)
  displayUnit?: 'GB' | 'TB' | 'PB';
}

export interface CalculatedItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unit: string;
  region?: Region;
  regionName?: string;
  unitPrice: number;
  listPrice: number;
  discount: number;
  finalPrice: number;
  displayUnit?: 'GB' | 'TB' | 'PB';
}

export interface CalculatorState {
  selectedServices: CalculatorInput[];
  globalDiscount: number;
  useGlobalDiscount: boolean;
  language: Language;
}

export interface ExportData {
  items: CalculatedItem[];
  totalMonthly: number;
  totalAnnual: number;
  exportDate: string;
}
