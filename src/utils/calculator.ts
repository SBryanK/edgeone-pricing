import type {
  BillingMode,
  CalculatorInput,
  CalculatedItem,
  DisplayUnit,
  Language,
  ServiceItem,
  TierMode,
} from '../types';
import {
  SERVICE_ITEMS,
  REGIONS,
  SERVICE_CATEGORIES,
  getAttainedTier,
  getTierTableForService,
  getTieredPrice,
} from '../data/pricing';

export const DISPLAY_UNIT_MULTIPLIERS: Record<DisplayUnit, number> = {
  GB: 1,
  TB: 1000,
  PB: 1_000_000,
};

export function displayMultiplier(unit?: DisplayUnit): number {
  return unit ? DISPLAY_UNIT_MULTIPLIERS[unit] ?? 1 : 1;
}

// Plans that fix how tiered traffic is rated (see getTieredPrice).
const ATTAINED_PLAN_IDS = new Set(['enterprise_postpaid']);
const PROGRESSIVE_PLAN_IDS = new Set(['enterprise_prepaid', 'plan_personal', 'plan_basic', 'plan_standard']);

/**
 * Tier mode for a draft. 'auto' follows the plan in the draft: Enterprise
 * postpaid → attained; Enterprise prepaid / Personal / Basic / Standard →
 * progressive. With no plan (or conflicting plans) it falls back to
 * 'attained', the Enterprise postpaid default this tool quotes most.
 */
export function resolveTierMode(items: CalculatorInput[], billingMode: BillingMode = 'auto'): TierMode {
  if (billingMode !== 'auto') return billingMode;
  const hasAttained = items.some((i) => ATTAINED_PLAN_IDS.has(i.serviceId));
  const hasProgressive = items.some((i) => PROGRESSIVE_PLAN_IDS.has(i.serviceId));
  if (hasProgressive && !hasAttained) return 'progressive';
  return 'attained';
}

type LocalizedField = 'name' | 'unit';

function localizeService(service: ServiceItem, field: LocalizedField, language: Language): string {
  const base = service[field];
  switch (language) {
    case 'zh':
      return service[`${field}Zh`] || base;
    case 'kr':
      return service[`${field}Kr`] || base;
    case 'jp':
      return service[`${field}Jp`] || base;
    case 'id':
      return service[`${field}Id`] || base;
    default:
      return base;
  }
}

export function getServiceName(service: ServiceItem, language: Language): string {
  return localizeService(service, 'name', language);
}

export function getServiceUnit(service: ServiceItem, language: Language): string {
  return localizeService(service, 'unit', language);
}

export function getServiceDescription(service: ServiceItem, language: Language): string {
  return language === 'id' ? service.descriptionId || service.description : service.description;
}

export function getRegionName(regionId: string, language: Language): string {
  const r = REGIONS.find((x) => x.id === regionId);
  if (!r) return regionId;
  switch (language) {
    case 'zh':
      return r.nameZh || r.name;
    case 'kr':
      return r.nameKr || r.name;
    case 'jp':
      return r.nameJp || r.name;
    case 'id':
      return r.nameId || r.name;
    default:
      return r.name;
  }
}

function sanitizeNumber(n: number, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function calculateItemPrice(
  input: CalculatorInput,
  language: Language,
  tierMode: TierMode = 'attained'
): CalculatedItem | null {
  const service = SERVICE_ITEMS.find((s) => s.id === input.serviceId);
  if (!service) return null;

  // Stored drafts are user-editable JSON; never let NaN / negatives leak into totals.
  const quantity = sanitizeNumber(input.quantity);
  const discount = sanitizeNumber(input.discount, { max: 100 });
  const region = input.region || 'chinese_mainland';

  let unitPrice = 0;
  let listPrice = 0;
  let tierLabel: string | undefined;
  let appliedTierMode: TierMode | undefined;

  const tierTable = service.hasRegionalPricing && service.hasTieredPricing ? getTierTableForService(service.id) : undefined;
  if (tierTable) {
    const tier = getAttainedTier(tierTable, region, quantity);
    unitPrice = tier?.pricePerGB ?? 0;
    tierLabel = tier?.tier;
    listPrice = getTieredPrice(tierTable, region, quantity, tierMode);
    appliedTierMode = tierMode;
  } else if (service.basePrice !== undefined) {
    unitPrice = service.basePrice;
    listPrice = unitPrice * quantity;
  }

  const finalPrice = listPrice * (1 - discount / 100);
  const effectiveUnitPrice = quantity > 0 ? listPrice / quantity : unitPrice;

  return {
    serviceId: service.id,
    serviceName: getServiceName(service, language),
    quantity,
    unit: getServiceUnit(service, language),
    region: service.hasRegionalPricing ? region : undefined,
    regionName: service.hasRegionalPricing ? getRegionName(region, language) : undefined,
    unitPrice,
    effectiveUnitPrice,
    listPrice,
    discount,
    finalPrice,
    displayUnit: input.displayUnit,
    tierMode: appliedTierMode,
    tierLabel,
  };
}

export function calculateItems(
  items: CalculatorInput[],
  language: Language,
  billingMode: BillingMode = 'auto'
): CalculatedItem[] {
  const mode = resolveTierMode(items, billingMode);
  return items
    .map((item) => calculateItemPrice(item, language, mode))
    .filter((item): item is CalculatedItem => item !== null);
}

export function calculateTotal(items: CalculatedItem[]): { monthly: number; annual: number } {
  const monthly = items.reduce((sum, item) => sum + item.finalPrice, 0);
  return {
    monthly,
    annual: monthly * 12,
  };
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Currency with enough precision for small unit prices ($0.00025, $0.0443…). */
export function formatUnitPrice(amount: number): string {
  if (!Number.isFinite(amount)) return formatCurrency(0);
  if (amount === 0) return formatCurrency(0);
  if (Math.abs(amount) >= 100) return formatCurrency(amount, 2);
  const decimals = Math.min(6, Math.max(2, Math.ceil(-Math.log10(Math.abs(amount))) + 3));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(num);
}

export function tierModeLabel(mode: TierMode): string {
  return mode === 'attained' ? 'Attained tier' : 'Progressive tiers';
}

/** English remark used by the CSV / Excel exports. */
export function exportRemark(item: CalculatedItem): string {
  const parts: string[] = [];
  if (item.regionName) parts.push(`Region: ${item.regionName}`);
  if (item.tierMode && item.tierLabel) {
    parts.push(`${tierModeLabel(item.tierMode)} (reached ${item.tierLabel})`);
  }
  return parts.join('; ');
}

// Helper function to escape CSV fields properly
function escapeCSVField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportToCSV(items: CalculatedItem[], totals: { monthly: number; annual: number }): string {
  const headers = [
    'Module',
    'Billing Item',
    'Unit',
    'Usage/month',
    'Unit price (USD)',
    'Total List Price (USD) / month',
    'Discount %',
    'Discounted price (USD) / month',
    'Remark',
  ];

  const dataRows: string[][] = items.map((item) => {
    const service = SERVICE_ITEMS.find((s) => s.id === item.serviceId);
    const category = SERVICE_CATEGORIES.find((c) => c.id === service?.category);

    const multiplier = displayMultiplier(item.displayUnit);
    const usage = item.quantity / multiplier;
    const unitLabel = item.displayUnit ? `/${item.displayUnit}` : item.unit;

    // Blended unit price so that usage × unit price = list price for every
    // row, including progressive tiered items.
    const unitPrice = item.effectiveUnitPrice * multiplier;

    return [
      escapeCSVField(category?.name || ''),
      escapeCSVField(item.serviceName),
      escapeCSVField(unitLabel.replace(/^\//, '')),
      String(usage),
      escapeCSVField(formatUnitPrice(unitPrice)),
      escapeCSVField(formatCurrency(item.listPrice)),
      `${item.discount}%`,
      escapeCSVField(formatCurrency(item.finalPrice)),
      escapeCSVField(exportRemark(item)),
    ];
  });

  // Keep column count aligned with the header so CSVs open cleanly in Excel/Sheets.
  const blankRow: string[] = Array(headers.length).fill('');
  const totalRow = (label: string, value: number) => [
    ...Array(headers.length - 3).fill(''),
    label,
    escapeCSVField(formatCurrency(value)),
    '',
  ];

  const allRows: string[][] = [
    headers,
    ...dataRows,
    blankRow,
    totalRow('Monthly Total:', totals.monthly),
    totalRow('Annual Total:', totals.annual),
  ];

  return allRows.map((row) => row.join(',')).join('\r\n');
}

export function exportToJSON(
  items: CalculatedItem[],
  totals: { monthly: number; annual: number },
  meta: Record<string, unknown> = {}
): string {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      ...meta,
      items,
      totals,
    },
    null,
    2
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick; some browsers cancel the download if revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  // Prepend a UTF-8 BOM for CSV so Excel opens non-ASCII (CJK) characters correctly.
  const isCsv = mimeType.startsWith('text/csv');
  const blob = new Blob(isCsv ? ['﻿', content] : [content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}
