/**
 * Excel (.xlsx) export that mirrors the layout of the company template
 * `EdgeOne Pricing Quotation.xlsx` ("Overseas pricing" sheet).
 *
 *   - Built with ExcelJS, which (unlike the SheetJS community build) actually
 *     writes cell styles: header fills, borders, number formats, frozen panes.
 *   - Loaded with a dynamic import so the ~1 MB library is only fetched on
 *     the first export.
 *   - Live formulas let the recipient edit Usage or Discount in Excel:
 *       Total List Price (G) = E * F
 *       Discounted price (I) = E * F * (1 - H)
 *       Subtotal = SUM(...), Grand total = Subtotal * Contract Duration
 *     Column F is the blended unit price (list price / usage), so E * F equals
 *     the app's list price for every row, including progressive tiered items.
 *     Each formula carries its computed result so viewers that do not
 *     recalculate (previewers, Google Drive thumbnails) still show numbers.
 *   - Comparing several drafts yields one sheet per draft plus a
 *     "Comparison Summary" sheet.
 */

import type { Workbook, Worksheet, Style, Borders } from 'exceljs';
import type { CalculatedItem, TierMode } from '../types';
import { SERVICE_ITEMS, SERVICE_CATEGORIES, PRICING_AS_OF } from '../data/pricing';
import { getPriceSource } from '../data/sources';
import { displayMultiplier, downloadBlob, exportRemark, tierModeLabel } from './calculator';

export interface DraftExportPayload {
  id: string;
  name: string;
  items: CalculatedItem[];
  totals: { monthly: number; annual: number };
  tierMode?: TierMode;
  /** Contract duration in months; defaults to 12 to match the template. */
  contractMonths?: number;
}

/* ------------------------------------------------------------------ */
/*  Module (template "Module" column) mapping                         */
/* ------------------------------------------------------------------ */

const MODULE_LABEL_BY_SERVICE_ID: Record<string, string> = {
  plan_personal: 'Acceleration*',
  plan_basic: 'Acceleration*',
  plan_standard: 'Acceleration*',
  enterprise_postpaid: 'Acceleration*',
  enterprise_prepaid: 'Acceleration*',
  l7_traffic: 'Acceleration*',
  l7_bandwidth: 'Acceleration*',
  smart_acceleration: 'Acceleration*',
  http_requests: 'Acceleration*',
  l4_traffic: 'Acceleration',
  l4_bandwidth: 'Acceleration',
  ddos_essential: 'Security Protection',
  ddos_premium: 'Security Protection',
  ddos_china_extension: 'Security Protection',
  ddos_traffic_overage: 'Security Protection',
  ddos_resource_overage: 'Security Protection',
  ddos_global_proxy_hourly: 'Security Protection',
  ddos_china_l4_proxy_hourly: 'Security Protection',
  quic_requests: 'Value Added Services',
  bot_requests: 'Value Added Services',
  site_quota: 'Value Added Services',
  web_rules_quota: 'Value Added Services',
  china_optimization: 'Acceleration',
  image_processing: 'Media Processing',
  video_processing: 'Media Processing',
  media_processing: 'Media Processing',
  edge_function_requests: 'Edge Function',
  edge_function_cpu: 'Edge Function',
};

function moduleLabelFor(item: CalculatedItem): string {
  const mapped = MODULE_LABEL_BY_SERVICE_ID[item.serviceId];
  if (mapped) return mapped;
  const svc = SERVICE_ITEMS.find((s) => s.id === item.serviceId);
  const cat = SERVICE_CATEGORIES.find((c) => c.id === svc?.category);
  return cat?.name || 'Other';
}

function unitLabel(item: CalculatedItem): string {
  if (item.displayUnit) return `per ${item.displayUnit}`;
  const u = (item.unit || '').replace(/^\//, '').trim();
  if (!u) return '';
  return u.toLowerCase().startsWith('per ') ? u : `per ${u}`;
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const COLORS = {
  headerFill: 'FF1F4E78',
  subHeaderFill: 'FFD9E1F2',
  totalFill: 'FFFFF2CC',
  grandTotalFill: 'FFFFE699',
  border: 'FFBFBFBF',
};

const THIN = { style: 'thin' as const, color: { argb: COLORS.border } };
const BORDER: Partial<Borders> = { top: THIN, bottom: THIN, left: THIN, right: THIN };

const HEADER_STYLE: Partial<Style> = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: BORDER,
};

const DATA_STYLE: Partial<Style> = {
  font: { size: 10 },
  alignment: { vertical: 'middle', wrapText: true },
  border: BORDER,
};

const TOTAL_STYLE: Partial<Style> = {
  font: { bold: true, size: 11 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalFill } },
  alignment: { horizontal: 'right', vertical: 'middle' },
  border: BORDER,
};

const GRAND_STYLE: Partial<Style> = {
  font: { bold: true, size: 12, color: { argb: 'FF1F4E78' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.grandTotalFill } },
  alignment: { horizontal: 'right', vertical: 'middle' },
  border: BORDER,
};

const UNIT_PRICE_FMT = '"$"#,##0.00####';
const CURRENCY_FMT = '"$"#,##0.00';
const PERCENT_FMT = '0.##%';
const QTY_FMT = '#,##0.####';
const INTEGER_FMT = '#,##0';

/* ------------------------------------------------------------------ */
/*  Worksheet builders                                                */
/* ------------------------------------------------------------------ */

const HEADERS = [
  'S/N',
  'Module',
  'Billing Item',
  'Unit',
  'Usage/month',
  'Unit price (USD)',
  'Total List Price (USD) / month',
  'Discount %',
  'Discounted price (USD) / month',
  'Remark',
  'Price source',
];

function buildDraftSheet(ws: Worksheet, draft: DraftExportPayload, updatedDate: string): void {
  const contractMonths = draft.contractMonths ?? 12;

  ws.columns = [
    { width: 6 },
    { width: 20 },
    { width: 52 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 11 },
    { width: 18 },
    { width: 40 },
    { width: 24 },
  ];

  ws.mergeCells('C2:I2');
  ws.getCell('C2').value = `Billing Mode: Monthly${draft.tierMode ? ` — tiered traffic: ${tierModeLabel(draft.tierMode)}` : ''}`;
  ws.getCell('C2').font = { bold: true, size: 13 };
  ws.getCell('J2').value = 'Price list as of';
  ws.getCell('K2').value = PRICING_AS_OF;
  ws.getCell('J3').value = 'Updated Date:';
  ws.getCell('K3').value = updatedDate;
  for (const ref of ['J2', 'J3']) {
    ws.getCell(ref).font = { bold: true };
    ws.getCell(ref).alignment = { horizontal: 'right' };
  }

  const headerRow = ws.getRow(4);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.style = HEADER_STYLE;
  });
  headerRow.height = 30;

  const firstDataRow = 5;
  const items = draft.items;

  items.forEach((item, idx) => {
    const r = firstDataRow + idx;
    const mult = displayMultiplier(item.displayUnit);
    const usage = item.quantity / mult;
    const unitPrice = item.effectiveUnitPrice * mult;
    const discountRate = item.discount / 100;
    const source = getPriceSource(item.serviceId);

    const row = ws.getRow(r);
    row.values = [
      idx + 1,
      moduleLabelFor(item),
      item.serviceName,
      unitLabel(item),
      usage,
      unitPrice,
      { formula: `E${r}*F${r}`, result: item.listPrice },
      discountRate,
      { formula: `E${r}*F${r}*(1-H${r})`, result: item.finalPrice },
      exportRemark(item),
      source.status === 'verified' ? 'Official docs' : 'Reference — confirm',
    ];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.style = { ...DATA_STYLE };
    });
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).numFmt = QTY_FMT;
    row.getCell(6).numFmt = UNIT_PRICE_FMT;
    row.getCell(7).numFmt = CURRENCY_FMT;
    row.getCell(8).numFmt = PERCENT_FMT;
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(9).numFmt = CURRENCY_FMT;
    row.getCell(11).value = { text: row.getCell(11).value as string, hyperlink: source.url };
    row.getCell(11).font = { size: 10, color: { argb: 'FF0563C1' }, underline: true };
  });

  const lastDataRow = firstDataRow + Math.max(items.length, 1) - 1;
  if (items.length === 0) {
    const row = ws.getRow(firstDataRow);
    HEADERS.forEach((_, i) => {
      row.getCell(i + 1).style = { ...DATA_STYLE };
    });
    row.getCell(3).value = 'No items';
  }

  const noteRow = lastDataRow + 1;
  ws.getCell(`B${noteRow}`).value = '* indicates mandatory';
  ws.getCell(`B${noteRow}`).font = { italic: true, size: 9, color: { argb: 'FF808080' } };

  const subtotalRow = noteRow + 1;
  const contractRow = subtotalRow + 1;
  const grandRow = contractRow + 1;
  const listSubtotal = items.reduce((s, i) => s + i.listPrice, 0);

  const setTotal = (ref: string, value: ExcelValue, style: Partial<Style>, fmt?: string) => {
    const cell = ws.getCell(ref);
    cell.value = value;
    cell.style = { ...style, ...(fmt ? { numFmt: fmt } : {}) };
  };

  setTotal(`C${subtotalRow}`, 'Subtotal (Before GST)', TOTAL_STYLE);
  setTotal(`G${subtotalRow}`, { formula: `SUM(G${firstDataRow}:G${lastDataRow})`, result: listSubtotal }, TOTAL_STYLE, CURRENCY_FMT);
  setTotal(`I${subtotalRow}`, { formula: `SUM(I${firstDataRow}:I${lastDataRow})`, result: draft.totals.monthly }, TOTAL_STYLE, CURRENCY_FMT);

  setTotal(`C${contractRow}`, 'Contract Duration (Month)', TOTAL_STYLE);
  setTotal(`G${contractRow}`, contractMonths, TOTAL_STYLE, INTEGER_FMT);
  setTotal(`I${contractRow}`, contractMonths, TOTAL_STYLE, INTEGER_FMT);

  setTotal(`C${grandRow}`, 'Grandtotal (USD)', GRAND_STYLE);
  setTotal(`G${grandRow}`, { formula: `G${subtotalRow}*G${contractRow}`, result: listSubtotal * contractMonths }, GRAND_STYLE, CURRENCY_FMT);
  setTotal(`I${grandRow}`, { formula: `I${subtotalRow}*I${contractRow}`, result: draft.totals.monthly * contractMonths }, GRAND_STYLE, CURRENCY_FMT);

  const disclaimerRow = grandRow + 2;
  ws.mergeCells(`B${disclaimerRow}:K${disclaimerRow}`);
  ws.getCell(`B${disclaimerRow}`).value =
    `Indicative list prices (reviewed ${PRICING_AS_OF}) from Tencent Cloud EdgeOne public documentation. ` +
    'Items marked "Reference — confirm" were not re-verified. Not an official quotation.';
  ws.getCell(`B${disclaimerRow}`).font = { italic: true, size: 9, color: { argb: 'FF808080' } };
  ws.getCell(`B${disclaimerRow}`).alignment = { wrapText: true };
  ws.getRow(disclaimerRow).height = 28;

  ws.views = [{ state: 'frozen', ySplit: 4 }];
}

type ExcelValue = string | number | { formula: string; result: number };

function buildComparisonSheet(ws: Worksheet, drafts: DraftExportPayload[]): void {
  ws.columns = [{ width: 36 }, ...drafts.map(() => ({ width: 22 }))];
  const lastCol = drafts.length + 1;

  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell('A1').value = 'Comparison Summary';
  ws.getCell('A1').font = { bold: true, size: 14 };

  const header = ws.getRow(3);
  header.getCell(1).value = 'Metric';
  drafts.forEach((d, i) => {
    header.getCell(i + 2).value = d.name;
  });
  header.eachCell((c) => {
    c.style = HEADER_STYLE;
  });

  const rows: Array<{ label: string; values: Array<number | string>; fmt?: string }> = [
    { label: 'Line items (count)', values: drafts.map((d) => d.items.length), fmt: INTEGER_FMT },
    { label: 'Tiered traffic pricing', values: drafts.map((d) => (d.tierMode ? tierModeLabel(d.tierMode) : '—')) },
    { label: 'Monthly total (USD)', values: drafts.map((d) => d.totals.monthly), fmt: CURRENCY_FMT },
    { label: 'Annual total (USD)', values: drafts.map((d) => d.totals.annual), fmt: CURRENCY_FMT },
    {
      label: 'Weighted discount',
      values: drafts.map((d) => {
        const list = d.items.reduce((s, it) => s + it.listPrice, 0);
        return list > 0 ? 1 - d.totals.monthly / list : 0;
      }),
      fmt: PERCENT_FMT,
    },
  ];

  rows.forEach((row, idx) => {
    const r = ws.getRow(idx + 4);
    r.getCell(1).value = row.label;
    r.getCell(1).style = { ...DATA_STYLE, font: { bold: true, size: 10 } };
    row.values.forEach((v, i) => {
      const cell = r.getCell(i + 2);
      cell.value = v;
      cell.style = { ...DATA_STYLE, alignment: { horizontal: 'right', vertical: 'middle' }, ...(row.fmt ? { numFmt: row.fmt } : {}) };
    });
  });

  const deltaRow = ws.getRow(rows.length + 5);
  deltaRow.getCell(1).value = 'Delta vs. cheapest (annual)';
  deltaRow.getCell(1).style = {
    ...DATA_STYLE,
    font: { bold: true, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subHeaderFill } },
  };
  const minAnnual = Math.min(...drafts.map((d) => d.totals.annual || 0));
  drafts.forEach((d, i) => {
    const delta = (d.totals.annual || 0) - minAnnual;
    const cell = deltaRow.getCell(i + 2);
    cell.value = delta;
    cell.style = {
      ...DATA_STYLE,
      numFmt: CURRENCY_FMT,
      alignment: { horizontal: 'right', vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: delta === 0 ? 'FFD7EDDA' : 'FFF8D7DA' } },
      font: { bold: true, size: 10, color: { argb: delta === 0 ? 'FF0A6637' : 'FF8B0000' } },
    };
  });
}

/** Excel sheet-name rules: <=31 chars, no `\ / ? * [ ] :` */
export function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
}

export async function buildWorkbook(drafts: DraftExportPayload[]): Promise<Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EdgeOne Pricing Calculator';
  wb.created = new Date();

  const list = drafts.length > 0 ? drafts : [{ id: 'empty', name: 'Draft', items: [], totals: { monthly: 0, annual: 0 } }];
  const updatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (list.length > 1) {
    buildComparisonSheet(wb.addWorksheet('Comparison Summary'), list);
  }

  const usedNames = new Set<string>(list.length > 1 ? ['Comparison Summary'] : []);
  list.forEach((d, i) => {
    const baseName = sanitizeSheetName(d.name || `Draft ${i + 1}`);
    let name = baseName;
    let suffix = 1;
    while (usedNames.has(name.toLowerCase()) || usedNames.has(name)) {
      const tail = ` (${++suffix})`;
      name = `${baseName.slice(0, 31 - tail.length)}${tail}`;
    }
    usedNames.add(name.toLowerCase());
    buildDraftSheet(wb.addWorksheet(name), d, updatedDate);
  });

  return wb;
}

/**
 * Build and trigger a browser download of the .xlsx workbook.
 *   - Single draft   : one sheet mirroring "Overseas pricing"
 *   - Multiple drafts: "Comparison Summary" + one sheet per draft
 */
export async function exportToExcel(drafts: DraftExportPayload[], filename: string): Promise<void> {
  const wb = await buildWorkbook(drafts);
  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}
