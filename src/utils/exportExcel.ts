/**
 * Excel (.xlsx) export that mirrors the layout of the company template
 * `EdgeOne Pricing Quotation.xlsx` ("Overseas pricing" sheet).
 *
 * Design goals:
 *   1. Produce a real .xlsx using SheetJS (`xlsx`).
 *   2. Preserve live formulas so the recipient can edit Usage or Discount
 *      in Excel and see totals recompute:
 *        - Total List Price (column G) = F * E
 *        - Discounted price  (column I) = E * F * (1 - H)
 *        - Subtotal row  = SUM(...)
 *        - Grand total   = Subtotal * Contract Duration
 *   3. Apply cell formatting close to the template (currency, percent,
 *      header fills, borders, column widths, merges).
 *   4. When comparing multiple drafts, emit one sheet per draft plus a
 *      side-by-side "Comparison Summary" sheet.
 */

import * as XLSX from 'xlsx';
import type { CalculatedItem, Language } from '../types';
import { SERVICE_ITEMS, SERVICE_CATEGORIES } from '../data/pricing';

export interface DraftExportPayload {
  id: string;
  name: string;
  items: CalculatedItem[];
  totals: { monthly: number; annual: number };
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
  smart_acceleration: 'Acceleration*',
  http_requests: 'Acceleration*',
  l4_traffic: 'Acceleration',
  ddos_essential: 'Security Protection',
  ddos_premium: 'Security Protection',
  ddos_china_extension: 'Security Protection',
  ddos_traffic_overage: 'Security Protection',
  ddos_resource_overage: 'Security Protection',
  ddos_global_proxy_hourly: 'Security Protection',
  ddos_china_l4_proxy_hourly: 'Security Protection',
  quic_requests: 'Value Added Services',
  bot_protection: 'Value Added Services',
  site_quota: 'Value Added Services',
  web_rules_quota: 'Value Added Services',
  china_optimization: 'Acceleration',
  image_processing: 'Media Processing',
  video_processing: 'Media Processing',
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

/* ------------------------------------------------------------------ */
/*  Display-unit helpers                                              */
/* ------------------------------------------------------------------ */

const UNIT_MULTIPLIERS: Record<'GB' | 'TB' | 'PB', number> = {
  GB: 1,
  TB: 1000,
  PB: 1_000_000,
};

function effectiveUnitLabel(item: CalculatedItem): string {
  if (item.displayUnit) return `per ${item.displayUnit}`;
  const u = (item.unit || '').replace(/^\//, '').trim();
  if (!u) return '';
  if (u.toLowerCase().startsWith('per ')) return u;
  return `per ${u}`;
}

function effectiveUsage(item: CalculatedItem): number {
  const mult = item.displayUnit ? UNIT_MULTIPLIERS[item.displayUnit] : 1;
  return item.quantity / mult;
}

function effectiveUnitPrice(item: CalculatedItem): number {
  const mult = item.displayUnit ? UNIT_MULTIPLIERS[item.displayUnit] : 1;
  return item.unitPrice * mult;
}

/* ------------------------------------------------------------------ */
/*  Styling helpers                                                   */
/* ------------------------------------------------------------------ */

const COLORS = {
  headerFill: 'FF1F4E78',
  subHeaderFill: 'FFD9E1F2',
  totalFill: 'FFFFF2CC',
  grandTotalFill: 'FFFFE699',
  border: 'FFBFBFBF',
};

const THIN_BORDER = { style: 'thin', color: { rgb: COLORS.border } };
const CELL_BORDER = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 11 },
  fill: { patternType: 'solid', fgColor: { rgb: COLORS.headerFill } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: CELL_BORDER,
};

const TITLE_STYLE = {
  font: { bold: true, sz: 13 },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const DATA_STYLE_BASE = {
  alignment: { vertical: 'center', wrapText: true },
  border: CELL_BORDER,
  font: { sz: 10 },
};

const CURRENCY_FMT = '"$"#,##0.0000';
const CURRENCY_TOTAL_FMT = '"$"#,##0.00';
const PERCENT_FMT = '0%';
const INTEGER_FMT = '#,##0';

type Cell = XLSX.CellObject;

function txt(v: string, style?: object): Cell {
  return { t: 's', v, s: { ...DATA_STYLE_BASE, ...(style || {}) } } as Cell;
}
function num(v: number, fmt?: string, style?: object): Cell {
  return {
    t: 'n',
    v,
    z: fmt,
    s: { ...DATA_STYLE_BASE, numFmt: fmt, ...(style || {}) },
  } as Cell;
}
function formula(f: string, fmt?: string, style?: object): Cell {
  return {
    t: 'n',
    f,
    z: fmt,
    s: { ...DATA_STYLE_BASE, numFmt: fmt, ...(style || {}) },
  } as Cell;
}

/* ------------------------------------------------------------------ */
/*  Worksheet builder                                                 */
/* ------------------------------------------------------------------ */

function buildWorksheetForDraft(
  draft: DraftExportPayload,
  opts: { sheetTitle: string; updatedDate: string }
): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const contractMonths = draft.contractMonths ?? 12;

  ws['!cols'] = [
    { wch: 7 },   // A  S/N
    { wch: 18 },  // B  Module
    { wch: 60 },  // C  Billing Item
    { wch: 18 },  // D  Unit
    { wch: 18 },  // E  Usage/month
    { wch: 18 },  // F  List price (USD) / month
    { wch: 18 },  // G  Total list price
    { wch: 12 },  // H  Discount %
    { wch: 18 },  // I  Discounted price
    { wch: 28 },  // J  Remark
    { wch: 18 },  // K  EO SA highest discount
  ];

  ws['C2'] = { t: 's', v: 'Billing Mode: Monthly', s: TITLE_STYLE } as Cell;
  ws['J2'] = { t: 's', v: 'Version', s: { font: { bold: true }, alignment: { horizontal: 'right' } } } as Cell;
  ws['K2'] = { t: 'n', v: 2, s: { alignment: { horizontal: 'left' } } } as Cell;

  ws['J3'] = { t: 's', v: 'Updated Date:', s: { font: { bold: true }, alignment: { horizontal: 'right' } } } as Cell;
  ws['K3'] = { t: 's', v: opts.updatedDate, s: { alignment: { horizontal: 'left' } } } as Cell;

  const HEADERS = [
    'S/N',
    'Module',
    'Billing Item',
    'Unit',
    'Usage/month',
    'List price (USD) / month',
    'Total List Price (USD) / month',
    'Discount %',
    'Discounted price (USD) / month',
    'Remark',
    'EO SA highest discount',
  ];
  HEADERS.forEach((h, i) => {
    const col = XLSX.utils.encode_col(i);
    ws[`${col}4`] = { t: 's', v: h, s: HEADER_STYLE } as Cell;
  });

  const firstDataRow = 5;
  const items = draft.items;
  const lastDataRow = firstDataRow + Math.max(items.length - 1, 0);

  items.forEach((item, idx) => {
    const r = firstDataRow + idx;
    const usage = effectiveUsage(item);
    const unitPrice = effectiveUnitPrice(item);
    const discountRate = item.discount / 100;

    ws[`A${r}`] = num(idx + 1, INTEGER_FMT, { alignment: { horizontal: 'center' } });
    ws[`B${r}`] = txt(moduleLabelFor(item));
    ws[`C${r}`] = txt(item.serviceName);
    ws[`D${r}`] = txt(effectiveUnitLabel(item));
    ws[`E${r}`] = num(usage, INTEGER_FMT);
    ws[`F${r}`] = num(unitPrice, CURRENCY_FMT);
    ws[`G${r}`] = formula(`F${r}*E${r}`, CURRENCY_TOTAL_FMT);
    ws[`H${r}`] = num(discountRate, PERCENT_FMT, { alignment: { horizontal: 'center' } });
    ws[`I${r}`] = formula(`E${r}*(F${r}*(1-H${r}))`, CURRENCY_TOTAL_FMT);
    ws[`J${r}`] = txt(item.regionName ? `Region: ${item.regionName}` : '');
    ws[`K${r}`] = num(discountRate, PERCENT_FMT, { alignment: { horizontal: 'center' } });
  });

  if (items.length === 0) {
    const r = firstDataRow;
    HEADERS.forEach((_, i) => {
      const col = XLSX.utils.encode_col(i);
      ws[`${col}${r}`] = txt('', {});
    });
    ws[`G${r}`] = num(0, CURRENCY_TOTAL_FMT);
    ws[`I${r}`] = num(0, CURRENCY_TOTAL_FMT);
  }

  const noteRow = lastDataRow + 1;
  ws[`B${noteRow}`] = {
    t: 's',
    v: '* indicates mandatory',
    s: { font: { italic: true, sz: 9, color: { rgb: 'FF808080' } } },
  } as Cell;

  const subtotalRow = noteRow + 1;
  const contractRow = subtotalRow + 1;
  const grandtotalRow = contractRow + 1;

  const totalRowStyle = {
    font: { bold: true, sz: 11 },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.totalFill } },
    border: CELL_BORDER,
    alignment: { horizontal: 'right', vertical: 'center' },
  };
  const grandRowStyle = {
    font: { bold: true, sz: 12, color: { rgb: 'FF1F4E78' } },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.grandTotalFill } },
    border: CELL_BORDER,
    alignment: { horizontal: 'right', vertical: 'center' },
  };

  ws[`C${subtotalRow}`] = { t: 's', v: 'Subtotal (Before GST)', s: totalRowStyle } as Cell;
  ws[`G${subtotalRow}`] = formula(`SUM(G${firstDataRow}:G${lastDataRow})`, CURRENCY_TOTAL_FMT, totalRowStyle);
  ws[`I${subtotalRow}`] = formula(`SUM(I${firstDataRow}:I${lastDataRow})`, CURRENCY_TOTAL_FMT, totalRowStyle);

  ws[`C${contractRow}`] = { t: 's', v: 'Contract Duration (Month)', s: totalRowStyle } as Cell;
  ws[`G${contractRow}`] = num(contractMonths, INTEGER_FMT, totalRowStyle);
  ws[`I${contractRow}`] = num(contractMonths, INTEGER_FMT, totalRowStyle);

  ws[`C${grandtotalRow}`] = { t: 's', v: 'Grandtotal (Annual/USD)', s: grandRowStyle } as Cell;
  ws[`G${grandtotalRow}`] = formula(`G${subtotalRow}*G${contractRow}`, CURRENCY_TOTAL_FMT, grandRowStyle);
  ws[`I${grandtotalRow}`] = formula(`I${subtotalRow}*I${contractRow}`, CURRENCY_TOTAL_FMT, grandRowStyle);

  ws['!ref'] = `A1:K${grandtotalRow}`;
  ws['!merges'] = [
    { s: { r: 1, c: 2 }, e: { r: 1, c: 8 } },
  ];
  // Freeze header row on open
  ws['!views'] = [{ state: 'frozen', ySplit: 4 }];

  void opts.sheetTitle;
  return ws;
}

/* ------------------------------------------------------------------ */
/*  Summary (comparison) sheet                                        */
/* ------------------------------------------------------------------ */

function buildComparisonSummarySheet(drafts: DraftExportPayload[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};

  ws['!cols'] = [
    { wch: 42 },
    ...drafts.map(() => ({ wch: 22 })),
  ];

  ws['A1'] = { t: 's', v: 'Comparison Summary', s: { font: { bold: true, sz: 14 } } } as Cell;
  ws['A3'] = { t: 's', v: 'Metric', s: HEADER_STYLE } as Cell;
  drafts.forEach((d, i) => {
    const col = XLSX.utils.encode_col(i + 1);
    ws[`${col}3`] = { t: 's', v: d.name, s: HEADER_STYLE } as Cell;
  });

  const rows: Array<{ label: string; values: Array<number>; fmt: string }> = [
    { label: 'Line Items (count)', values: drafts.map((d) => d.items.length), fmt: INTEGER_FMT },
    { label: 'Monthly Total (USD)', values: drafts.map((d) => d.totals.monthly), fmt: CURRENCY_TOTAL_FMT },
    { label: 'Annual Total (USD)', values: drafts.map((d) => d.totals.annual), fmt: CURRENCY_TOTAL_FMT },
    {
      label: 'Avg. Discount Applied',
      values: drafts.map((d) => {
        if (d.items.length === 0) return 0;
        const avg = d.items.reduce((sum, it) => sum + it.discount, 0) / d.items.length;
        return avg / 100;
      }),
      fmt: PERCENT_FMT,
    },
  ];

  rows.forEach((row, idx) => {
    const r = idx + 4;
    ws[`A${r}`] = txt(row.label, { font: { bold: true } });
    row.values.forEach((v, i) => {
      const col = XLSX.utils.encode_col(i + 1);
      ws[`${col}${r}`] = num(v, row.fmt, { alignment: { horizontal: 'right' } });
    });
  });

  const deltaRow = rows.length + 5;
  ws[`A${deltaRow}`] = txt('Delta vs. Cheapest (Annual)', {
    font: { bold: true },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.subHeaderFill } },
  });
  const minAnnual = Math.min(...drafts.map((d) => d.totals.annual || 0));
  drafts.forEach((d, i) => {
    const col = XLSX.utils.encode_col(i + 1);
    const delta = (d.totals.annual || 0) - minAnnual;
    ws[`${col}${deltaRow}`] = num(delta, CURRENCY_TOTAL_FMT, {
      alignment: { horizontal: 'right' },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: delta === 0 ? 'FFD7EDDA' : 'FFF8D7DA' },
      },
      font: { bold: true, color: { rgb: delta === 0 ? 'FF0A6637' : 'FF8B0000' } },
    });
  });

  const lastCol = XLSX.utils.encode_col(drafts.length);
  ws['!ref'] = `A1:${lastCol}${deltaRow}`;
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: drafts.length } }];
  return ws;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Build and trigger a browser download of the .xlsx workbook.
 *   - Single draft  : one sheet mirroring "Overseas pricing"
 *   - Multiple drafts: one sheet per draft + "Comparison Summary" sheet
 */
export function exportToExcel(
  drafts: DraftExportPayload[],
  filename: string,
  _language?: Language
): void {
  if (drafts.length === 0) {
    drafts = [{ id: 'empty', name: 'Draft', items: [], totals: { monthly: 0, annual: 0 } }];
  }

  const wb = XLSX.utils.book_new();
  const updatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isComparison = drafts.length > 1;
  if (isComparison) {
    const summary = buildComparisonSummarySheet(drafts);
    XLSX.utils.book_append_sheet(wb, summary, 'Comparison Summary');
  }

  const usedNames = new Set<string>();
  drafts.forEach((d, i) => {
    const baseName = sanitizeSheetName(d.name || `Draft ${i + 1}`);
    let name = baseName;
    let suffix = 1;
    while (usedNames.has(name)) {
      const tail = ` (${++suffix})`;
      name = `${baseName.slice(0, 31 - tail.length)}${tail}`;
    }
    usedNames.add(name);

    const ws = buildWorksheetForDraft(d, { sheetTitle: name, updatedDate });
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellStyles: true });
}

/** Excel sheet-name rules: <=31 chars, no `\ / ? * [ ] :` */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
}
