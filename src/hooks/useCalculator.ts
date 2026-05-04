import { useState, useCallback, useMemo, useEffect } from 'react';
import type { CalculatorInput, CalculatedItem, Region, Language } from '../types';
import { calculateItemPrice, calculateTotal } from '../utils/calculator';

export interface Draft {
  id: string;
  name: string;
  items: CalculatorInput[];
  globalDiscount: number;
}

interface UseCalculatorReturn {
  // Draft Management
  drafts: Draft[];
  activeDraftId: string;
  createDraft: () => void;
  deleteDraft: (id: string) => void;
  switchDraft: (id: string) => void;
  renameDraft: (id: string, name: string) => void;

  // Active Draft Data
  items: CalculatorInput[];
  calculatedItems: CalculatedItem[];
  totals: { monthly: number; annual: number };
  globalDiscount: number;

  // Actions
  language: Language;
  addItem: (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: 'GB' | 'TB' | 'PB') => void;
  updateItem: (index: number, updates: Partial<CalculatorInput>) => void;
  removeItem: (index: number) => void;
  clearAll: () => void;
  setGlobalDiscount: (discount: number) => void;
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
}

const STORAGE_KEY = 'edgeone_calculator_drafts';
const ACTIVE_DRAFT_KEY = 'edgeone_calculator_active_draft';

export function useCalculator(): UseCalculatorReturn {
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Defensive validation: must be a non-empty array of drafts with required fields
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every(
              (d) =>
                d &&
                typeof d.id === 'string' &&
                typeof d.name === 'string' &&
                Array.isArray(d.items) &&
                typeof d.globalDiscount === 'number'
            )
          ) {
            return parsed as Draft[];
          }
        }
      } catch (e) {
        console.error('Failed to load drafts from localStorage', e);
      }
    }
    return [{ id: 'default', name: 'Draft 1', items: [], globalDiscount: 0 }];
  });

  const [activeDraftId, setActiveDraftId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_DRAFT_KEY) || 'default';
    }
    return 'default';
  });
  
  const [language, setLanguage] = useState<Language>('en');

  // Persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
      localStorage.setItem(ACTIVE_DRAFT_KEY, activeDraftId);
    }
  }, [drafts, activeDraftId]);

  // Ensure active draft exists, fallback to first
  const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];

  // --- Draft Management ---

  const createDraft = useCallback(() => {
    const newId = Date.now().toString();
    const newDraft: Draft = {
      id: newId,
      name: `Draft ${drafts.length + 1}`,
      items: [],
      globalDiscount: 0,
    };
    setDrafts(prev => [...prev, newDraft]);
    setActiveDraftId(newId);
  }, [drafts.length]);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => {
      if (prev.length <= 1) return prev; // Don't delete last draft
      const filtered = prev.filter(d => d.id !== id);
      // If the active draft was deleted, fall back to the first remaining draft.
      // Compute this inside the updater so we never read stale `drafts` state.
      if (id === activeDraftId && filtered.length > 0) {
        setActiveDraftId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeDraftId]);

  const switchDraft = useCallback((id: string) => {
    setActiveDraftId(id);
  }, []);

  const renameDraft = useCallback((id: string, name: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  }, []);

  // --- Active Draft Actions ---

  const addItem = useCallback(
    (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: 'GB' | 'TB' | 'PB') => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== activeDraftId) return d;
        const newItem: CalculatorInput = {
          serviceId,
          quantity,
          region,
          discount: discount ?? d.globalDiscount,
          displayUnit,
        };
        return { ...d, items: [...d.items, newItem] };
      }));
    },
    [activeDraftId]
  );

  const updateItem = useCallback(
    (index: number, updates: Partial<CalculatorInput>) => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== activeDraftId) return d;
        const newItems = d.items.map((item, i) => (i === index ? { ...item, ...updates } : item));
        return { ...d, items: newItems };
      }));
    },
    [activeDraftId]
  );

  const removeItem = useCallback((index: number) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== activeDraftId) return d;
      return { ...d, items: d.items.filter((_, i) => i !== index) };
    }));
  }, [activeDraftId]);

  const clearAll = useCallback(() => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== activeDraftId) return d;
      return { ...d, items: [] };
    }));
  }, [activeDraftId]);

  const setGlobalDiscount = useCallback(
    (discount: number) => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== activeDraftId) return d;
        // Update global discount AND apply to all existing items
        const newItems = d.items.map(item => ({ ...item, discount }));
        return { ...d, globalDiscount: discount, items: newItems };
      }));
    },
    [activeDraftId]
  );

  // --- Calculations ---

  const calculatedItems = useMemo(() => {
    return activeDraft.items
      .map((item) => {
        return calculateItemPrice(item, language);
      })
      .filter((item): item is CalculatedItem => item !== null);
  }, [activeDraft.items, language]);

  const totals = useMemo(() => calculateTotal(calculatedItems), [calculatedItems]);

  // --- Compare Mode Operations ---

  const addItemToDraft = useCallback(
    (draftId: string, item: CalculatorInput) => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== draftId) return d;
        return { ...d, items: [...d.items, item] };
      }));
    },
    []
  );

  const updateItemInDraft = useCallback(
    (draftId: string, index: number, updates: Partial<CalculatorInput>) => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== draftId) return d;
        const newItems = d.items.map((item, i) => (i === index ? { ...item, ...updates } : item));
        return { ...d, items: newItems };
      }));
    },
    []
  );

  const removeItemFromDraft = useCallback(
    (draftId: string, index: number) => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== draftId) return d;
        return { ...d, items: d.items.filter((_, i) => i !== index) };
      }));
    },
    []
  );

  const setGlobalDiscountForDraft = useCallback(
    (draftId: string, discount: number) => {
      setDrafts(prev => prev.map(d => {
        if (d.id !== draftId) return d;
        const newItems = d.items.map(item => ({ ...item, discount }));
        return { ...d, globalDiscount: discount, items: newItems };
      }));
    },
    []
  );

  const moveItemBetweenDrafts = useCallback(
    (sourceDraftId: string, targetDraftId: string, itemIndex: number) => {
      if (sourceDraftId === targetDraftId) return;
      setDrafts(prev => {
        const sourceDraft = prev.find(d => d.id === sourceDraftId);
        if (!sourceDraft || itemIndex < 0 || itemIndex >= sourceDraft.items.length) {
          return prev;
        }

        const itemToMove = sourceDraft.items[itemIndex];

        return prev.map(d => {
          if (d.id === sourceDraftId) {
            return { ...d, items: d.items.filter((_, i) => i !== itemIndex) };
          }
          if (d.id === targetDraftId) {
            return { ...d, items: [...d.items, itemToMove] };
          }
          return d;
        });
      });
    },
    []
  );

  const mergeDrafts = useCallback(
    (sourceDraftId: string, targetDraftId: string) => {
      setDrafts(prev => {
        const sourceDraft = prev.find(d => d.id === sourceDraftId);
        if (!sourceDraft) return prev;

        return prev.map(d => {
          if (d.id === targetDraftId) {
            return { ...d, items: [...d.items, ...sourceDraft.items] };
          }
          if (d.id === sourceDraftId) {
            return { ...d, items: [] };
          }
          return d;
        });
      });
    },
    []
  );

  const getCalculatedItemsForDraft = useCallback(
    (draftId: string): CalculatedItem[] => {
      const draft = drafts.find(d => d.id === draftId);
      if (!draft) return [];

      return draft.items
        .map((item) => calculateItemPrice(item, language))
        .filter((item): item is CalculatedItem => item !== null);
    },
    [drafts, language]
  );

  const getTotalsForDraft = useCallback(
    (draftId: string): { monthly: number; annual: number } => {
      const calcItems = getCalculatedItemsForDraft(draftId);
      return calculateTotal(calcItems);
    },
    [getCalculatedItemsForDraft]
  );

  return {
    drafts,
    activeDraftId,
    createDraft,
    deleteDraft,
    switchDraft,
    renameDraft,

    items: activeDraft.items,
    calculatedItems,
    totals,
    globalDiscount: activeDraft.globalDiscount,

    language,
    addItem,
    updateItem,
    removeItem,
    clearAll,
    setGlobalDiscount,
    setLanguage,

    // Compare Mode Operations
    addItemToDraft,
    updateItemInDraft,
    removeItemFromDraft,
    setGlobalDiscountForDraft,
    moveItemBetweenDrafts,
    mergeDrafts,
    getCalculatedItemsForDraft,
    getTotalsForDraft,
  };
}
