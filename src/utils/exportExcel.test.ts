import { describe, it, expect } from 'vitest';
import { buildWorkbook, sanitizeSheetName } from './exportExcel';
import { calculateItems, calculateTotal } from './calculator';

describe('exportExcel', () => {
  it('writes formulas whose cached results match the app totals', async () => {
    const items = calculateItems(
      [
        { serviceId: 'l7_traffic', quantity: 15_000, region: 'chinese_mainland', discount: 10, displayUnit: 'TB' },
        { serviceId: 'smart_acceleration', quantity: 20, discount: 10 },
      ],
      'en',
      'progressive'
    );
    const totals = calculateTotal(items);
    const wb = await buildWorkbook([{ id: 'd', name: 'Quote', items, totals, tierMode: 'progressive' }]);
    const ws = wb.getWorksheet('Quote')!;

    // Row 5 = first item: usage 15 (TB) × blended $/TB = list price.
    expect(ws.getCell('E5').value).toBe(15);
    expect((ws.getCell('F5').value as number) * 15).toBeCloseTo(items[0].listPrice, 6);
    expect(ws.getCell('G5').value).toMatchObject({ formula: 'E5*F5' });
    expect(ws.getCell('H5').value).toBeCloseTo(0.1);

    // Subtotal row: 5, 6 data, 7 note, 8 subtotal.
    expect(ws.getCell('I8').value).toMatchObject({ formula: 'SUM(I5:I6)', result: totals.monthly });
    expect(ws.getCell('I10').value).toMatchObject({ result: totals.annual });
  });

  it('adds a comparison sheet and de-duplicates sheet names', async () => {
    const empty = { items: [], totals: { monthly: 0, annual: 0 } };
    const wb = await buildWorkbook([
      { id: '1', name: 'Plan', ...empty },
      { id: '2', name: 'Plan', ...empty },
    ]);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Comparison Summary', 'Plan', 'Plan (2)']);
  });

  it('sanitises sheet names', () => {
    expect(sanitizeSheetName('a/b:c?[d]')).toBe('a b c  d');
    expect(sanitizeSheetName('')).toBe('Sheet');
    expect(sanitizeSheetName('x'.repeat(40))).toHaveLength(31);
  });
});
