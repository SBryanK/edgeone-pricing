import type { CalculatorInput, CalculatedItem, Language } from '../types';
import {
  SERVICE_ITEMS,
  REGIONS,
  SERVICE_CATEGORIES,
  L7_TRAFFIC_PRICING,
  L4_TRAFFIC_PRICING,
  L7_BANDWIDTH_PRICING,
  L4_BANDWIDTH_PRICING,
  getTieredPrice,
  getDisplayTierPrice,
} from '../data/pricing';

export function calculateItemPrice(input: CalculatorInput, language: Language): CalculatedItem | null {
  const service = SERVICE_ITEMS.find((s) => s.id === input.serviceId);
  if (!service) return null;

  let unitPrice = 0;
  let listPrice = 0;
  const region = input.region || 'chinese_mainland';
  const regionInfo = REGIONS.find((r) => r.id === region);

  if (service.hasRegionalPricing && service.hasTieredPricing) {
    // Pick the correct pricing matrix based on service id / pricing type.
    // Traffic services are billed per GB with TB-scaled tier boundaries.
    // Bandwidth services are billed per Mbps with Mbps-scaled tier boundaries.
    let pricingData;
    switch (service.id) {
      case 'l7_traffic':
        pricingData = L7_TRAFFIC_PRICING;
        break;
      case 'l4_traffic':
        pricingData = L4_TRAFFIC_PRICING;
        break;
      case 'l7_bandwidth':
        pricingData = L7_BANDWIDTH_PRICING;
        break;
      case 'l4_bandwidth':
        pricingData = L4_BANDWIDTH_PRICING;
        break;
      default:
        // Fallback: if it's any other future regional+tiered service, use L7 traffic
        // as the safest default so we never blow up rendering.
        pricingData = service.pricingType === 'bandwidth' ? L7_BANDWIDTH_PRICING : L7_TRAFFIC_PRICING;
    }
    listPrice = getTieredPrice(pricingData, region, input.quantity);
    unitPrice = getDisplayTierPrice(pricingData, region, input.quantity);
  } else if (service.basePrice !== undefined) {
    // Handle flat rate pricing
    unitPrice = service.basePrice;
    listPrice = unitPrice * input.quantity;
  }

  // Apply discount - discount is the percentage OFF (e.g., 10 means 10% off)
  const discountMultiplier = 1 - input.discount / 100;
  const finalPrice = listPrice * discountMultiplier;

  let serviceName = service.name;
  if (language === 'zh') serviceName = service.nameZh;
  else if (language === 'kr') serviceName = service.nameKr || service.name;
  else if (language === 'jp') serviceName = service.nameJp || service.name;
  else if (language === 'id') serviceName = service.nameId || service.name;

  let unit = service.unit;
  if (language === 'zh') unit = service.unitZh;
  else if (language === 'kr') unit = service.unitKr || service.unit;
  else if (language === 'jp') unit = service.unitJp || service.unit;
  else if (language === 'id') unit = service.unitId || service.unit;

  let regionName = undefined;
  if (service.hasRegionalPricing && regionInfo) {
    regionName = regionInfo.name;
    if (language === 'zh') regionName = regionInfo.nameZh;
    else if (language === 'kr') regionName = regionInfo.nameKr || regionInfo.name;
    else if (language === 'jp') regionName = regionInfo.nameJp || regionInfo.name;
    else if (language === 'id') regionName = regionInfo.nameId || regionInfo.name;
  }

  return {
    serviceId: service.id,
    serviceName,
    quantity: input.quantity,
    unit,
    region: service.hasRegionalPricing ? region : undefined,
    regionName,
    unitPrice,
    listPrice,
    discount: input.discount,
    finalPrice,
    displayUnit: input.displayUnit,
  };
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
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// Helper function to escape CSV fields properly
function escapeCSVField(field: string): string {
  // If the field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
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
    'List price (USD) / month',
    'Total List Price (USD) / month',
    'Discount %',
    'Discounted price (USD) / month',
    'Remark',
  ];

  const dataRows: string[][] = items.map((item) => {
    const service = SERVICE_ITEMS.find(s => s.id === item.serviceId);
    const category = SERVICE_CATEGORIES.find(c => c.id === service?.category);

    const displayUnit = item.displayUnit;
    const multiplier = displayUnit === 'TB' ? 1000 : (displayUnit === 'PB' ? 1000000 : 1);
    const usage = displayUnit ? item.quantity / multiplier : item.quantity;
    const unitLabel = displayUnit ? `/${displayUnit}` : item.unit;

    // Scale unit price to match the display unit (per GB → per TB/PB when requested).
    const effectiveUnitPrice = item.unitPrice * multiplier;

    return [
      escapeCSVField(category?.name || ''),
      escapeCSVField(item.serviceName),
      escapeCSVField(unitLabel.replace(/^\//, '')),
      usage.toString(),
      escapeCSVField(formatCurrency(effectiveUnitPrice, 4)),
      escapeCSVField(formatCurrency(item.listPrice)),
      `${item.discount}%`,
      escapeCSVField(formatCurrency(item.finalPrice)),
      escapeCSVField(item.regionName ? `Region: ${item.regionName}` : ''),
    ];
  });

  // Blank separator row — keep column count aligned with header so CSVs open cleanly in Excel/Sheets.
  const blankRow: string[] = Array(headers.length).fill('');
  const monthlyTotalRow: string[] = [...Array(headers.length - 2).fill(''), 'Monthly Total:', escapeCSVField(formatCurrency(totals.monthly))];
  const annualTotalRow: string[] = [...Array(headers.length - 2).fill(''), 'Annual Total:', escapeCSVField(formatCurrency(totals.annual))];

  const allRows: string[][] = [headers, ...dataRows, blankRow, monthlyTotalRow, annualTotalRow];

  // Use CRLF line endings — standard for CSV and interpreted correctly by Excel.
  return allRows.map((row) => row.join(',')).join('\r\n');
}

export function exportToJSON(items: CalculatedItem[], totals: { monthly: number; annual: number }): string {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      items,
      totals,
    },
    null,
    2
  );
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  // Prepend a UTF-8 BOM for CSV so Excel opens non-ASCII (CJK) characters correctly.
  const isCsv = mimeType.startsWith('text/csv');
  const blob = new Blob(isCsv ? ['\uFEFF', content] : [content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
