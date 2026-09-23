import { describe, it, expect } from 'vitest';
import {
  getTieredPrice,
  getAttainedTier,
  L7_TRAFFIC_PRICING,
  L4_TRAFFIC_PRICING,
  L7_BANDWIDTH_PRICING,
  SERVICE_ITEMS,
  REGIONS,
} from '../data/pricing';
import { PRICE_SOURCES } from '../data/sources';
import {
  calculateItemPrice,
  calculateItems,
  calculateTotal,
  exportToCSV,
  formatUnitPrice,
  resolveTierMode,
} from './calculator';
import type { CalculatorInput, Region } from '../types';

const TB = 1000; // EdgeOne bills 1 TB = 1000 GB

describe('tiered pricing — official EdgeOne worked examples', () => {
  // https://www.tencentcloud.com/document/product/1145/55643
  it('Enterprise postpaid (attained tier): 15 TB CN L7 = 15 × 1000 × 0.0399 = 598.5 USD', () => {
    expect(getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', 15 * TB, 'attained')).toBeCloseTo(598.5, 6);
  });

  it('Enterprise postpaid (attained tier): 15 TB CN L4 = 15 × 1000 × 0.1534 = 2,301 USD', () => {
    expect(getTieredPrice(L4_TRAFFIC_PRICING, 'chinese_mainland', 15 * TB, 'attained')).toBeCloseTo(2301, 6);
  });

  it('Standard plan (progressive): 15 TB overage accumulates 173 + 211 + 241.7 USD across the example hours', () => {
    // After the 3 TB plan quota: 4 TB + 5 TB + 6 TB = 15 TB of overage.
    const total = getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', 15 * TB, 'progressive');
    expect(total).toBeCloseTo(173 + 211 + 241.7, 6);
  });

  it('attained tier includes the upper boundary (exactly 2 TB stays in 0-2TB)', () => {
    expect(getAttainedTier(L7_TRAFFIC_PRICING, 'chinese_mainland', 2 * TB)?.tier).toBe('0-2TB');
    expect(getAttainedTier(L7_TRAFFIC_PRICING, 'chinese_mainland', 2 * TB + 1)?.tier).toBe('2-10TB');
  });

  it('beyond the last boundary uses the top tier', () => {
    expect(getAttainedTier(L7_TRAFFIC_PRICING, 'chinese_mainland', 5_000 * TB)?.tier).toBe('1000TB+');
  });

  it('returns 0 for unknown region, zero and invalid volumes', () => {
    expect(getTieredPrice(L7_TRAFFIC_PRICING, 'unknown_region' as Region, 100)).toBe(0);
    expect(getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', 0)).toBe(0);
    expect(getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', -5)).toBe(0);
    expect(getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', Number.NaN)).toBe(0);
  });
});

describe('price tables are well-formed', () => {
  const tables = { L7_TRAFFIC_PRICING, L4_TRAFFIC_PRICING, L7_BANDWIDTH_PRICING };
  for (const [name, table] of Object.entries(tables)) {
    it(`${name}: every region present, tiers contiguous, prices positive and non-increasing`, () => {
      expect(table.map((t) => t.region).sort()).toEqual(REGIONS.map((r) => r.id).sort());
      for (const { tiers } of table) {
        expect(tiers[0].minGB).toBe(0);
        expect(tiers[tiers.length - 1].maxGB).toBe(Infinity);
        tiers.forEach((tier, i) => {
          expect(tier.pricePerGB).toBeGreaterThan(0);
          if (i > 0) {
            expect(tier.minGB).toBe(tiers[i - 1].maxGB);
            expect(tier.pricePerGB).toBeLessThanOrEqual(tiers[i - 1].pricePerGB);
          }
        });
      }
    });
  }
});

describe('catalogue', () => {
  it('has unique ids and a source entry for every service', () => {
    const ids = SERVICE_ITEMS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(PRICE_SOURCES[id], id).toBeDefined();
  });

  it('VAU-derived prices match 100 VAU × $0.0143', () => {
    const price = (id: string) => SERVICE_ITEMS.find((s) => s.id === id)?.basePrice;
    expect(price('smart_acceleration')).toBeCloseTo(1.43, 10);
    expect(price('bot_requests')).toBeCloseTo(1.43, 10);
    expect(price('quic_requests')).toBeCloseTo(0.715, 10);
  });
});

describe('resolveTierMode', () => {
  const item = (serviceId: string): CalculatorInput => ({ serviceId, quantity: 1, discount: 0 });

  it('defaults to attained when no plan is present', () => {
    expect(resolveTierMode([item('l7_traffic')])).toBe('attained');
  });
  it('follows the plan', () => {
    expect(resolveTierMode([item('enterprise_postpaid')])).toBe('attained');
    expect(resolveTierMode([item('enterprise_prepaid')])).toBe('progressive');
    expect(resolveTierMode([item('plan_standard')])).toBe('progressive');
  });
  it('an explicit choice wins over auto', () => {
    expect(resolveTierMode([item('plan_standard')], 'attained')).toBe('attained');
  });
});

describe('calculateItemPrice', () => {
  it('applies the discount to flat-rate items', () => {
    const result = calculateItemPrice({ serviceId: 'http_requests', quantity: 1000, discount: 10 }, 'en');
    expect(result?.listPrice).toBeCloseTo(1000 * 0.0071);
    expect(result?.finalPrice).toBeCloseTo(1000 * 0.0071 * 0.9);
    expect(result?.effectiveUnitPrice).toBeCloseTo(0.0071);
  });

  it('prices regional tiered services and reports the tier reached', () => {
    const result = calculateItemPrice({ serviceId: 'l7_traffic', quantity: 100, region: 'north_america', discount: 0 }, 'en');
    expect(result?.listPrice).toBeCloseTo(100 * 0.0756);
    expect(result?.region).toBe('north_america');
    expect(result?.tierLabel).toBe('0-2TB');
  });

  it('blended unit price × quantity equals list price for progressive tiers', () => {
    const r = calculateItemPrice({ serviceId: 'l7_traffic', quantity: 15 * TB, region: 'chinese_mainland', discount: 0 }, 'en', 'progressive');
    expect(r).not.toBeNull();
    expect(r!.effectiveUnitPrice * r!.quantity).toBeCloseTo(r!.listPrice, 6);
    expect(r!.unitPrice).toBeCloseTo(0.0399);
  });

  it('clamps corrupt input instead of producing NaN', () => {
    const r = calculateItemPrice({ serviceId: 'http_requests', quantity: Number.NaN, discount: 150 }, 'en');
    expect(r?.finalPrice).toBe(0);
    expect(r?.discount).toBe(100);
  });

  it('returns null for unknown services', () => {
    expect(calculateItemPrice({ serviceId: 'nope', quantity: 1, discount: 0 }, 'en')).toBeNull();
  });

  it('localises names', () => {
    expect(calculateItemPrice({ serviceId: 'l7_traffic', quantity: 1, discount: 0 }, 'id')?.serviceName).toBe('Trafik Akselerasi Konten L7');
  });
});

describe('calculateItems / totals', () => {
  it('switches the whole draft to progressive when a Standard plan is present', () => {
    const items: CalculatorInput[] = [
      { serviceId: 'plan_standard', quantity: 1, discount: 0 },
      { serviceId: 'l7_traffic', quantity: 15 * TB, region: 'chinese_mainland', discount: 0 },
    ];
    const calc = calculateItems(items, 'en');
    expect(calc[1].tierMode).toBe('progressive');
    expect(calc[1].listPrice).toBeCloseTo(625.7, 6);
  });

  it('sums monthly and annual totals', () => {
    const base = { quantity: 1, unit: 'unit', discount: 0 };
    const totals = calculateTotal([
      { ...base, serviceId: 'a', serviceName: 'A', unitPrice: 100, effectiveUnitPrice: 100, listPrice: 100, finalPrice: 100 },
      { ...base, serviceId: 'b', serviceName: 'B', unitPrice: 200, effectiveUnitPrice: 200, listPrice: 200, finalPrice: 200 },
    ]);
    expect(totals).toEqual({ monthly: 300, annual: 3600 });
  });
});

describe('exportToCSV', () => {
  it('writes blended unit prices and keeps every row the same width', () => {
    const items = calculateItems(
      [{ serviceId: 'l7_traffic', quantity: 15 * TB, region: 'chinese_mainland', discount: 0, displayUnit: 'TB' }],
      'en',
      'progressive'
    );
    const csv = exportToCSV(items, calculateTotal(items));
    const rows = csv.split('\r\n');
    const width = rows[0].split(',').length;
    expect(rows[1]).toContain('41.71'); // 625.7 / 15 TB = $41.713/TB
    expect(rows[1]).toContain('Progressive tiers (reached 10-50TB)');
    // Count fields outside quotes.
    const fieldCount = (row: string) => row.replace(/"(?:[^"]|"")*"/g, 'x').split(',').length;
    for (const r of rows) expect(fieldCount(r)).toBe(width);
  });
});

describe('formatUnitPrice', () => {
  it('keeps enough precision for small prices', () => {
    expect(formatUnitPrice(0.00025)).toBe('$0.00025');
    expect(formatUnitPrice(0.0443)).toBe('$0.0443');
    expect(formatUnitPrice(1500)).toBe('$1,500.00');
  });
});
