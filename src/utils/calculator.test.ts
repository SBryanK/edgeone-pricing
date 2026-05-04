import { describe, it, expect } from 'vitest';
import { getTieredPrice, L7_TRAFFIC_PRICING } from '../data/pricing';
import { calculateItemPrice, calculateTotal } from './calculator';
import type { CalculatorInput, Region } from '../types';

describe('Calculator Logic', () => {
  describe('getTieredPrice', () => {
    it('should calculate correct price for Chinese Mainland L7 traffic (first tier)', () => {
      // 0-2TB tier is 0.0443 per GB
      const price = getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', 100);
      expect(price).toBeCloseTo(100 * 0.0443);
    });

    it('should calculate correct price for Chinese Mainland L7 traffic (crossing tiers)', () => {
      // 0-2TB: 0.0443, 2-10TB: 0.0422
      // 3000 GB = 2000 * 0.0443 + 1000 * 0.0422
      const price = getTieredPrice(L7_TRAFFIC_PRICING, 'chinese_mainland', 3000);
      const expected = (2000 * 0.0443) + (1000 * 0.0422);
      expect(price).toBeCloseTo(expected);
    });

    it('should return 0 for unknown region', () => {
      const price = getTieredPrice(L7_TRAFFIC_PRICING, 'unknown_region' as Region, 100);
      expect(price).toBe(0);
    });
  });

  describe('calculateItemPrice', () => {
    it('should calculate correct final price with discount', () => {
      const input: CalculatorInput = {
        serviceId: 'http_requests',
        quantity: 1000, // 1000 * 10K requests
        discount: 10, // 10% off
      };
      
      // Base price 0.0071 per unit
      const result = calculateItemPrice(input, 'en');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.listPrice).toBeCloseTo(1000 * 0.0071);
        expect(result.finalPrice).toBeCloseTo(1000 * 0.0071 * 0.9);
        expect(result.discount).toBe(10);
      }
    });

    it('should handle regional pricing service', () => {
      const input: CalculatorInput = {
        serviceId: 'l7_traffic',
        quantity: 100,
        region: 'north_america',
        discount: 0,
      };

      // North America 0-2TB: 0.0756
      const result = calculateItemPrice(input, 'en');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.listPrice).toBeCloseTo(100 * 0.0756);
        expect(result.region).toBe('north_america');
      }
    });
  });

  describe('calculateTotal', () => {
    it('should sum up monthly and annual totals', () => {
      const items = [
        { finalPrice: 100, serviceName: 'A', quantity: 1, unit: 'unit', unitPrice: 100, listPrice: 100, discount: 0, serviceId: 'a' },
        { finalPrice: 200, serviceName: 'B', quantity: 1, unit: 'unit', unitPrice: 200, listPrice: 200, discount: 0, serviceId: 'b' },
      ];
      
      const totals = calculateTotal(items);
      expect(totals.monthly).toBe(300);
      expect(totals.annual).toBe(3600);
    });
  });
});
