import { useState, useCallback, useMemo, useEffect } from 'react';
import type { BillingMode, CalculatorInput, CalculatedItem, DisplayUnit, Region, Language, TierMode } from '../types';
import { calculateItems, calculateTotal, resolveTierMode } from '../utils/calculator';
import { REGIONS, SERVICE_ITEMS } from '../data/pricing';

export interface Draft {
  id: string;
  name: string;
  items: CalculatorInput[];
  globalDiscount: number;
  /** How tiered traffic is rated. Missing on drafts saved before this field existed → 'auto'. */
  billingMode?: BillingMode;
}

interface UseCalculatorReturn {
  // Draft Management
  drafts: Draft[];
  activeDraftId: string;
  createDraft: () => void;
  duplicateDraft: (id: string) => void;
  deleteDraft: (id: string) => void;
  switchDraft: (id: string) => void;
  renameDraft: (id: string, name: string) => void;

  // Active Draft Data
  items: CalculatorInput[];
  calculatedItems: CalculatedItem[];
  totals: { monthly: number; annual: number };
  globalDiscount: number;
  billingMode: BillingMode;
  tierMode: TierMode;

  // Actions
  language: Language;
  addItem: (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: DisplayUnit) => void;
  updateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  removeItem: (index: number) => void;
  clearAll: () => void;
  setGlobalDiscount: (discount: number) => void;
  setBillingMode: (mode: BillingMode) => void;
  setLanguage: (lang: Language) => void;

  // Compare Mode Operations (for specific drafts)
  addItemToDraft: (draftId: string, item: CalculatorInput) => void;
  updateItemInDraft: (draftId: string, index: number, updates: Partial<CalculatorInput>) => void;
  removeItemFromDraft: (draftId: string, index: number) => void;
  setGlobalDiscountForDraft: (draftId: string, discount: number) => void;
  moveItemBetweenDrafts: (sourceDraftId: string, targetDraftId: string, itemIndex: number) => void;
  mergeDrafts: (sourceDraftId: string, targetDraftId: string) => void;
  getCalculatedItemsForDraft: (draftId: string) => CalculatedItem[];
  getTotalsForDraft: (draftId: string) => { monthly: number; annual: number };
  getTierModeForDraft: (draftId: string) => TierMode;
}

const STORAGE_KEY = 'edgeone_calculator_drafts';
const ACTIVE_DRAFT_KEY = 'edgeone_calculator_active_draft';
const LANGUAGE_KEY = 'edgeone_calculator_language';

const VALID_SERVICE_IDS = new Set(SERVICE_ITEMS.map((s) => s.id));
const VALID_REGIONS = new Set<string>(REGIONS.map((r) => r.id));
const VALID_LANGUAGES: ReadonlySet<Language> = new Set<Language>(['en', 'zh', 'kr', 'jp', 'id']);
const VALID_BILLING_MODES: ReadonlySet<BillingMode> = new Set<BillingMode>(['auto', 'attained', 'progressive']);

const DEFAULT_DRAFTS: Draft[] = [{ id: 'default', name: 'Draft 1', items: [], globalDiscount: 0, billingMode: 'auto' }];

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Bring a stored item up to the current catalogue. Returns null for items we
 * cannot represent any more so one stale entry never breaks the whole draft.
 */
export function migrateItem(raw: unknown): CalculatorInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  let serviceId = typeof r.serviceId === 'string' ? r.serviceId : '';
  let quantity = clampNumber(r.quantity, 0, Number.MAX_SAFE_INTEGER, 0);

  // `bot_protection` was quantified in raw VAU; BOT is 100 VAU per million requests.
  if (serviceId === 'bot_protection') {
    serviceId = 'bot_requests';
    quantity = quantity / 100;
  }
  if (!VALID_SERVICE_IDS.has(serviceId)) return null;

  const displayUnit = r.displayUnit === 'GB' || r.displayUnit === 'TB' || r.displayUnit === 'PB' ? r.displayUnit : undefined;
  const region = typeof r.region === 'string' && VALID_REGIONS.has(r.region) ? (r.region as Region) : undefined;

  return {
    serviceId,
    quantity,
    region,
    discount: clampNumber(r.discount, 0, 100, 0),
    displayUnit,
  };
}

export function parseStoredDrafts(saved: string | null): Draft[] | null {
  if (!saved) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  for (const d of parsed) {
    if (!d || typeof d !== 'object') continue;
    const rec = d as Record<string, unknown>;
    if (typeof rec.id !== 'string' || seen.has(rec.id)) continue;
    seen.add(rec.id);
    const items = Array.isArray(rec.items) ? rec.items.map(migrateItem).filter((i): i is CalculatorInput => i !== null) : [];
    drafts.push({
      id: rec.id,
      name: typeof rec.name === 'string' && rec.name.trim() ? rec.name : `Draft ${drafts.length + 1}`,
      items,
      globalDiscount: clampNumber(rec.globalDiscount, 0, 100, 0),
      billingMode: VALID_BILLING_MODES.has(rec.billingMode as BillingMode) ? (rec.billingMode as BillingMode) : 'auto',
    });
  }
  return drafts.length > 0 ? drafts : null;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded / storage disabled: the app keeps working in memory.
  }
}

function nextDraftName(drafts: Draft[], base = 'Draft'): string {
  const names = new Set(drafts.map((d) => d.name));
  let n = drafts.length + 1;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function useCalculator(): UseCalculatorReturn {
  const [drafts, setDrafts] = useState<Draft[]>(() => parseStoredDrafts(readStorage(STORAGE_KEY)) ?? DEFAULT_DRAFTS);

  const [activeDraftId, setActiveDraftId] = useState<string>(() => readStorage(ACTIVE_DRAFT_KEY) || drafts[0].id);

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = readStorage(LANGUAGE_KEY) as Language | null;
    return saved && VALID_LANGUAGES.has(saved) ? saved : 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    writeStorage(LANGUAGE_KEY, lang);
  }, []);

  useEffect(() => {
    writeStorage(STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  // Ensure active draft exists, fallback to first
  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0];

  useEffect(() => {
    writeStorage(ACTIVE_DRAFT_KEY, activeDraft.id);
  }, [activeDraft.id]);

  useEffect(() => {
    document.documentElement.lang = { en: 'en', zh: 'zh-CN', kr: 'ko', jp: 'ja', id: 'id' }[language];
  }, [language]);

  // --- Draft Management ---

  const createDraft = useCallback(() => {
    const id = newId();
    setDrafts((prev) => [...prev, { id, name: nextDraftName(prev), items: [], globalDiscount: 0, billingMode: 'auto' }]);
    setActiveDraftId(id);
  }, []);

  const duplicateDraft = useCallback((sourceId: string) => {
    const id = newId();
    setDrafts((prev) => {
      const src = prev.find((d) => d.id === sourceId);
      if (!src) return prev;
      const copy: Draft = { ...src, id, name: `${src.name} (copy)`, items: src.items.map((i) => ({ ...i })) };
      const idx = prev.findIndex((d) => d.id === sourceId);
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
    setActiveDraftId(id);
  }, []);

  const deleteDraft = useCallback(
    (id: string) => {
      if (drafts.length <= 1) return; // Never delete the last draft
      const idx = drafts.findIndex((d) => d.id === id);
      if (idx === -1) return;
      const remaining = drafts.filter((d) => d.id !== id);
      setDrafts(remaining);
      if (id === activeDraft.id) {
        setActiveDraftId(remaining[Math.max(0, idx - 1)].id);
      }
    },
    [drafts, activeDraft.id]
  );

  const switchDraft = useCallback((id: string) => {
    setActiveDraftId(id);
  }, []);

  const renameDraft = useCallback((id: string, name: string) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }, []);

  // --- Generic per-draft updaters (shared by normal and compare mode) ---

  const updateDraft = useCallback((draftId: string, fn: (d: Draft) => Draft) => {
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? fn(d) : d)));
  }, []);

  const addItemToDraft = useCallback(
    (draftId: string, item: CalculatorInput) => {
      updateDraft(draftId, (d) => ({ ...d, items: [...d.items, item] }));
    },
    [updateDraft]
  );

  const updateItemInDraft = useCallback(
    (draftId: string, index: number, updates: Partial<CalculatorInput>) => {
      updateDraft(draftId, (d) => ({
        ...d,
        items: d.items.map((item, i) => (i === index ? { ...item, ...updates } : item)),
      }));
    },
    [updateDraft]
  );

  const removeItemFromDraft = useCallback(
    (draftId: string, index: number) => {
      updateDraft(draftId, (d) => ({ ...d, items: d.items.filter((_, i) => i !== index) }));
    },
    [updateDraft]
  );

  const setGlobalDiscountForDraft = useCallback(
    (draftId: string, discount: number) => {
      const value = clampNumber(discount, 0, 100, 0);
      // The global discount is applied to every line of the draft.
      updateDraft(draftId, (d) => ({
        ...d,
        globalDiscount: value,
        items: d.items.map((item) => ({ ...item, discount: value })),
      }));
    },
    [updateDraft]
  );

  // --- Active Draft Actions ---

  const addItem = useCallback(
    (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: DisplayUnit) => {
      updateDraft(activeDraft.id, (d) => ({
        ...d,
        items: [...d.items, { serviceId, quantity, region, discount: discount ?? d.globalDiscount, displayUnit }],
      }));
    },
    [activeDraft.id, updateDraft]
  );

  const updateItem = useCallback(
    (index: number, updates: Partial<CalculatorInput>) => updateItemInDraft(activeDraft.id, index, updates),
    [activeDraft.id, updateItemInDraft]
  );

  const removeItem = useCallback(
    (index: number) => removeItemFromDraft(activeDraft.id, index),
    [activeDraft.id, removeItemFromDraft]
  );

  const clearAll = useCallback(() => {
    updateDraft(activeDraft.id, (d) => ({ ...d, items: [] }));
  }, [activeDraft.id, updateDraft]);

  const setGlobalDiscount = useCallback(
    (discount: number) => setGlobalDiscountForDraft(activeDraft.id, discount),
    [activeDraft.id, setGlobalDiscountForDraft]
  );

  const setBillingMode = useCallback(
    (mode: BillingMode) => updateDraft(activeDraft.id, (d) => ({ ...d, billingMode: mode })),
    [activeDraft.id, updateDraft]
  );

  // --- Calculations ---

  const billingMode = activeDraft.billingMode ?? 'auto';
  const tierMode = resolveTierMode(activeDraft.items, billingMode);

  const calculatedItems = useMemo(
    () => calculateItems(activeDraft.items, language, billingMode),
    [activeDraft.items, language, billingMode]
  );

  const totals = useMemo(() => calculateTotal(calculatedItems), [calculatedItems]);

  // --- Compare Mode Operations ---

  const moveItemBetweenDrafts = useCallback((sourceDraftId: string, targetDraftId: string, itemIndex: number) => {
    if (sourceDraftId === targetDraftId) return;
    setDrafts((prev) => {
      const sourceDraft = prev.find((d) => d.id === sourceDraftId);
      if (!sourceDraft || itemIndex < 0 || itemIndex >= sourceDraft.items.length) return prev;
      const itemToMove = sourceDraft.items[itemIndex];
      return prev.map((d) => {
        if (d.id === sourceDraftId) return { ...d, items: d.items.filter((_, i) => i !== itemIndex) };
        if (d.id === targetDraftId) return { ...d, items: [...d.items, itemToMove] };
        return d;
      });
    });
  }, []);

  const mergeDrafts = useCallback((sourceDraftId: string, targetDraftId: string) => {
    if (sourceDraftId === targetDraftId) return;
    setDrafts((prev) => {
      const sourceDraft = prev.find((d) => d.id === sourceDraftId);
      if (!sourceDraft) return prev;
      return prev.map((d) => {
        if (d.id === targetDraftId) return { ...d, items: [...d.items, ...sourceDraft.items] };
        if (d.id === sourceDraftId) return { ...d, items: [] };
        return d;
      });
    });
  }, []);

  const getCalculatedItemsForDraft = useCallback(
    (draftId: string): CalculatedItem[] => {
      const draft = drafts.find((d) => d.id === draftId);
      if (!draft) return [];
      return calculateItems(draft.items, language, draft.billingMode ?? 'auto');
    },
    [drafts, language]
  );

  const getTotalsForDraft = useCallback(
    (draftId: string) => calculateTotal(getCalculatedItemsForDraft(draftId)),
    [getCalculatedItemsForDraft]
  );

  const getTierModeForDraft = useCallback(
    (draftId: string): TierMode => {
      const draft = drafts.find((d) => d.id === draftId);
      return draft ? resolveTierMode(draft.items, draft.billingMode ?? 'auto') : 'attained';
    },
    [drafts]
  );

  return {
    drafts,
    activeDraftId: activeDraft.id,
    createDraft,
    duplicateDraft,
    deleteDraft,
    switchDraft,
    renameDraft,

    items: activeDraft.items,
    calculatedItems,
    totals,
    globalDiscount: activeDraft.globalDiscount,
    billingMode,
    tierMode,

    language,
    addItem,
    updateItem,
    removeItem,
    clearAll,
    setGlobalDiscount,
    setBillingMode,
    setLanguage,

    addItemToDraft,
    updateItemInDraft,
    removeItemFromDraft,
    setGlobalDiscountForDraft,
    moveItemBetweenDrafts,
    mergeDrafts,
    getCalculatedItemsForDraft,
    getTotalsForDraft,
    getTierModeForDraft,
  };
}
