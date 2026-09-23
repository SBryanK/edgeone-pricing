import { describe, it, expect } from 'vitest';
import { migrateItem, parseStoredDrafts } from './useCalculator';

describe('stored draft migration', () => {
  it('converts legacy bot_protection VAU quantities to million BOT requests', () => {
    expect(migrateItem({ serviceId: 'bot_protection', quantity: 2000, discount: 5 })).toEqual({
      serviceId: 'bot_requests',
      quantity: 20,
      region: undefined,
      discount: 5,
      displayUnit: undefined,
    });
  });

  it('drops unknown services and sanitises numbers', () => {
    expect(migrateItem({ serviceId: 'removed_service', quantity: 1, discount: 0 })).toBeNull();
    expect(migrateItem({ serviceId: 'l7_traffic', quantity: 'abc', discount: 500, region: 'mars' })).toEqual({
      serviceId: 'l7_traffic',
      quantity: 0,
      region: undefined,
      discount: 100,
      displayUnit: undefined,
    });
  });

  it('rejects malformed storage and keeps valid drafts', () => {
    expect(parseStoredDrafts('not json')).toBeNull();
    expect(parseStoredDrafts('[]')).toBeNull();
    const drafts = parseStoredDrafts(
      JSON.stringify([
        { id: 'a', name: 'A', items: [{ serviceId: 'l7_traffic', quantity: 10, discount: 0 }], globalDiscount: 0 },
        { id: 'a', name: 'duplicate id', items: [], globalDiscount: 0 },
        null,
      ])
    );
    expect(drafts).toHaveLength(1);
    expect(drafts?.[0].billingMode).toBe('auto');
  });
});
