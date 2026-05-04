import { useCallback, useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverlayProps } from '@dnd-kit/core';
import { Trash2, GitCompare, ArrowRightLeft, GripVertical } from 'lucide-react';
import {
  Header,
  ServiceCatalog,
  EstimateSlip,
  DraftsManager,
  RegionModal,
  ItemsModal,
  ModeModal,
  CompareView,
  LoginPage,
  Footer,
  AiAssistant,
} from './components';
import type { AiRecommendation } from './services/ai';
import { SERVICE_ITEMS } from './data/pricing';
import { useCalculator } from './hooks/useCalculator';
import type { Draft } from './hooks/useCalculator';
import type { CalculatedItem, Region, CalculatorInput, Language } from './types';
import { exportToCSV, exportToJSON, downloadFile } from './utils/calculator';
import { exportToExcel, type DraftExportPayload } from './utils/exportExcel';

// Session persistence for the lightweight login gate. `sessionStorage` survives
// a page refresh but is cleared when the tab closes — appropriate for a
// client-side demo gate that is not a real auth boundary.
const LOGIN_SESSION_KEY = 'edgeone_calculator_login';

const dropAnimation: DragOverlayProps['dropAnimation'] = {  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.3' },
    },
  }),
};

function TrashDroppable({ language }: { language: Language }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash-zone',
  });

  const label =
    language === 'zh'
      ? '松开删除'
      : language === 'kr'
      ? '놓아서 삭제'
      : language === 'jp'
      ? 'ドロップして削除'
      : language === 'id'
      ? 'Lepas untuk menghapus'
      : 'Drop to Remove';

  return (
    <div
      ref={setNodeRef}
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm transition-colors ${
        isOver ? 'bg-red-500/90' : 'bg-red-500/80'
      }`}
    >
      <Trash2 className={`w-16 h-16 text-white mb-2 ${isOver ? 'scale-125' : 'scale-100'} transition-transform`} />
      <span className="text-white text-xl font-bold">{label}</span>
    </div>
  );
}

// Compare Mode Layout with resizable catalog pane
interface CompareModeLayoutProps {
  language: Language;
  drafts: Draft[];
  initialDraftIds?: string[];
  addItem: (serviceId: string, quantity: number, region?: Region, discount?: number, displayUnit?: 'GB' | 'TB' | 'PB') => void;
  mergeDrafts: (sourceDraftId: string, targetDraftId: string) => void;
  getCalculatedItemsForDraft: (draftId: string) => CalculatedItem[];
  getTotalsForDraft: (draftId: string) => { monthly: number; annual: number };
  updateItemInDraft: (draftId: string, index: number, updates: Partial<CalculatorInput>) => void;
  removeItemFromDraft: (draftId: string, index: number) => void;
  setGlobalDiscountForDraft: (draftId: string, discount: number) => void;
  onExitCompare: () => void;
  onExportCompare?: (visibleDraftIds: string[]) => void;
}

function CompareModeLayout({
  language,
  drafts,
  initialDraftIds,
  addItem,
  mergeDrafts,
  getCalculatedItemsForDraft,
  getTotalsForDraft,
  updateItemInDraft,
  removeItemFromDraft,
  setGlobalDiscountForDraft,
  onExitCompare,
  onExportCompare,
}: CompareModeLayoutProps) {
  const [catalogWidth, setCatalogWidth] = useState(350);
  const isResizingCatalog = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompactCompare, setIsCompactCompare] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      setIsCompactCompare(window.innerWidth < 851 || window.innerHeight < 851);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const startCatalogResize = useCallback(() => {
    isResizingCatalog.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopCatalogResize = useCallback(() => {
    isResizingCatalog.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resizeCatalog = useCallback((e: MouseEvent) => {
    if (!isResizingCatalog.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;

    // Constraints: min 25%, max 75% of container
    const minWidth = containerRect.width * 0.25;
    const maxWidth = containerRect.width * 0.75;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setCatalogWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resizeCatalog);
    window.addEventListener('mouseup', stopCatalogResize);
    return () => {
      window.removeEventListener('mousemove', resizeCatalog);
      window.removeEventListener('mouseup', stopCatalogResize);
    };
  }, [resizeCatalog, stopCatalogResize]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 overflow-hidden ${isCompactCompare ? 'flex-col' : ''}`}
    >
      {/* Catalog on the left in compare mode */}
      <div
        className="overflow-hidden p-4 bg-gray-50 shrink-0"
        style={isCompactCompare ? { width: '100%', height: '40vh' } : { width: catalogWidth }}
      >
        <ServiceCatalog language={language} onAddItem={addItem} />
      </div>

      {/* Resize Handle */}
      {!isCompactCompare && (
        <div
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors shrink-0"
          onMouseDown={startCatalogResize}
        />
      )}

      {/* Compare View on the right */}
      <div className="flex-1 overflow-hidden min-w-0">
        <CompareView
          drafts={drafts}
          initialDraftIds={initialDraftIds}
          language={language}
          onChangeDraft={() => {}}
          onMergeDrafts={mergeDrafts}
          getCalculatedItemsForDraft={getCalculatedItemsForDraft}
          getTotalsForDraft={getTotalsForDraft}
          updateItemInDraft={updateItemInDraft}
          removeItemFromDraft={removeItemFromDraft}
          setGlobalDiscountForDraft={setGlobalDiscountForDraft}
          onExitCompare={onExitCompare}
          onExportCompare={onExportCompare}
        />
      </div>
    </div>
  );
}

function App() {
  const {
    drafts,
    activeDraftId,
    createDraft,
    deleteDraft,
    switchDraft,
    renameDraft,
    items,
    calculatedItems,
    totals,
    globalDiscount,
    language,
    addItem,
    updateItem,
    removeItem,
    clearAll,
    setGlobalDiscount,
    setLanguage,
    // Compare Mode Operations
    addItemToDraft,
    moveItemBetweenDrafts,
    mergeDrafts,
    getCalculatedItemsForDraft,
    getTotalsForDraft,
    updateItemInDraft,
    removeItemFromDraft,
    setGlobalDiscountForDraft,
  } = useCalculator();

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(LOGIN_SESSION_KEY) === '1';
    } catch {
      // Private browsing modes sometimes throw on sessionStorage access;
      // fall back to in-memory state.
      return false;
    }
  });

  const handleLogin = useCallback(() => {
    try {
      window.sessionStorage.setItem(LOGIN_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setIsLoggedIn(true);
  }, []);

  // ---------------------------------------------------------------------
  // AI Assistant → addItem adapter.
  //
  // The assistant emits `AiRecommendation[]` objects; this adapter validates
  // each entry against the known service catalogue / region list before
  // handing it off to `addItem`. Anything that fails validation is silently
  // dropped rather than throwing so a single bad suggestion does not kill
  // the whole batch.
  // ---------------------------------------------------------------------
  const VALID_REGIONS: ReadonlySet<Region> = new Set<Region>([
    'chinese_mainland',
    'north_america',
    'europe',
    'asia_pacific_1',
    'asia_pacific_2',
    'asia_pacific_3',
    'middle_east',
    'africa',
    'south_america',
  ]);
  const VALID_SERVICE_IDS = new Set(SERVICE_ITEMS.map((s) => s.id));

  const handleAiAddItems = useCallback((recs: AiRecommendation[]) => {
    for (const rec of recs) {
      if (!VALID_SERVICE_IDS.has(rec.serviceId)) continue;
      const qty = Number(rec.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const region: Region | undefined =
        rec.region && VALID_REGIONS.has(rec.region as Region)
          ? (rec.region as Region)
          : undefined;
      addItem(rec.serviceId, qty, region, undefined, rec.displayUnit);
    }
  // addItem is stable (useCallback in the hook); eslint would also accept it
  // here but we intentionally keep the list explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addItem]);

  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'catalog' | 'estimate'>('catalog');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareInitialDrafts, setCompareInitialDrafts] = useState<string[]>([]);
  const [discountMode, setDiscountMode] = useState<'global' | 'item'>('global');

  interface DraggedItemData {
    type: 'add-service' | 'remove-item' | 'move-between-drafts' | 'compare-pane-drag';
    serviceId?: string;
    quantity?: number;
    region?: string;
    displayUnit?: 'GB' | 'TB' | 'PB';
    name?: string;
    index?: number;
    // For move-between-drafts
    sourceDraftId?: string;
    sourcePaneIndex?: number;
    item?: {
      serviceId: string;
      quantity: number;
      region?: string;
      discount: number;
      displayUnit?: 'GB' | 'TB' | 'PB';
    };
    // For compare-pane-drag
    paneIndex?: number;
  }
  const [draggedItem, setDraggedItem] = useState<DraggedItemData | null>(null);

  const handleExport = useCallback(
    (format: 'csv' | 'json' | 'excel') => {
      const timestamp = new Date().toISOString().split('T')[0];
      if (format === 'csv') {
        const content = exportToCSV(calculatedItems, totals);
        downloadFile(content, `edgeone-pricing-${timestamp}.csv`, 'text/csv');
      } else if (format === 'json') {
        const content = exportToJSON(calculatedItems, totals);
        downloadFile(content, `edgeone-pricing-${timestamp}.json`, 'application/json');
      } else {
        // Excel export — match the company template format.
        // Use the active draft's name so the sheet is recognisable.
        const activeDraft = drafts.find((d) => d.id === activeDraftId);
        const payload: DraftExportPayload = {
          id: activeDraftId,
          name: activeDraft?.name || 'Quotation',
          items: calculatedItems,
          totals,
        };
        exportToExcel([payload], `edgeone-pricing-${timestamp}.xlsx`, language);
      }
    },
    [calculatedItems, totals, drafts, activeDraftId, language]
  );

  // Bulk export for Compare mode — produces a multi-sheet workbook containing
  // only the drafts the user is actively comparing (one sheet per pane) plus
  // a Comparison Summary sheet.
  const handleCompareExport = useCallback((visibleDraftIds: string[]) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const ids = (visibleDraftIds && visibleDraftIds.length > 0)
      ? visibleDraftIds
      : drafts.map((d) => d.id);
    const payloads: DraftExportPayload[] = ids
      .map((id) => {
        const d = drafts.find((x) => x.id === id);
        if (!d) return null;
        return {
          id: d.id,
          name: d.name,
          items: getCalculatedItemsForDraft(d.id),
          totals: getTotalsForDraft(d.id),
        } as DraftExportPayload;
      })
      .filter((p): p is DraftExportPayload => p !== null);

    if (payloads.length === 0) return;
    exportToExcel(payloads, `edgeone-pricing-comparison-${timestamp}.xlsx`, language);
  }, [drafts, getCalculatedItemsForDraft, getTotalsForDraft, language]);

  // Resizable Sidebar Logic
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      const minWidth = window.innerWidth * 0.25; // 25% min
      const maxWidth = window.innerWidth * 0.75; // 75% max
      
      if (newWidth > minWidth && newWidth < maxWidth) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Drag & Drop Handlers
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DraggedItemData | undefined;
    setDraggedItem(data || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const data = active.data.current as DraggedItemData | undefined;
    setDraggedItem(null);

    // Removal Logic (Drag Out)
    // If we're dragging a pane and drop it "nowhere" (not over a droppable), remove it.
    if (!over && data?.type === 'compare-pane-drag') {
        window.dispatchEvent(new CustomEvent('compare-view-remove-pane', { 
            detail: { paneIndex: data.paneIndex } 
        }));
        return;
    }

    if (!over) return;

    const overId = String(over.id);

    // Add Item (Catalog -> Estimate Slip in normal mode)
    if (data?.type === 'add-service' && overId === 'estimate-slip' && data.serviceId) {
      addItem(data.serviceId, data.quantity ?? 1, data.region as Region, undefined, data.displayUnit);
    }

    // Add Item (Catalog -> Compare Pane in compare mode)
    if (data?.type === 'add-service' && overId.startsWith('compare-pane-')) {
      const targetData = over.data.current;
      if (targetData?.draftId) {
        const targetDraft = drafts.find(d => d.id === targetData.draftId);
        addItemToDraft(targetData.draftId, {
          serviceId: data.serviceId!,
          quantity: data.quantity!,
          region: data.region as Region,
          discount: targetDraft?.globalDiscount ?? 0,
          displayUnit: data.displayUnit,
        });
      }
    }

    // Move Item Between Draft Panes in compare mode
    if (data?.type === 'move-between-drafts' && overId.startsWith('compare-pane-')) {
      const targetData = over.data.current;
      if (targetData?.draftId && data.sourceDraftId && data.sourceDraftId !== targetData.draftId) {
        moveItemBetweenDrafts(data.sourceDraftId, targetData.draftId, data.index!);
      }
    }

    // Remove Item (Estimate -> Trash)
    if (data?.type === 'remove-item' && overId === 'trash-zone') {
      if (typeof data.index === 'number') {
        removeItem(data.index);
      }
    }
  };

  const handleDraftDrop = useCallback((draftId: string) => {
    if (!draftId || draftId === activeDraftId) return;
    setCompareInitialDrafts([activeDraftId, draftId]);
    setIsCompareMode(true);
  }, [activeDraftId]);

  if (!isLoggedIn) {
    return <LoginPage language={language} onLogin={handleLogin} />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/** Overlay labels */}
      {/** These are used for drag previews */}
      {/** Keep near render to access language */}
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden text-slate-800">
        <Header
          language={language}
          onLanguageChange={setLanguage}
          onReset={clearAll}
          onOpenRegionModal={() => setIsRegionModalOpen(true)}
          onOpenItemsModal={() => setIsItemsModalOpen(true)}
          onOpenModeModal={() => setIsModeModalOpen(true)}
        />

        <RegionModal
          isOpen={isRegionModalOpen}
          onClose={() => setIsRegionModalOpen(false)}
          language={language}
        />

        <ItemsModal
          isOpen={isItemsModalOpen}
          onClose={() => setIsItemsModalOpen(false)}
          language={language}
        />

        <ModeModal
          isOpen={isModeModalOpen}
          onClose={() => setIsModeModalOpen(false)}
          language={language}
        />

        {/* Top Bar: Drafts */}
        <div className="bg-white border-b border-gray-200 px-4 pt-2 shrink-0 z-10">
          <div className="flex items-center justify-between">
            <DraftsManager
              drafts={drafts}
              activeDraftId={activeDraftId}
              onCreate={createDraft}
              onDelete={deleteDraft}
              onSwitch={switchDraft}
              onRename={renameDraft}
              language={language}
            />
            {/* Compare Mode Toggle */}
            {!isCompareMode && drafts.length >= 2 && (
              <button
                onClick={() => {
                   setCompareInitialDrafts([]);
                   setIsCompareMode(true);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors mb-2"
              >
                <GitCompare className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'zh'
                    ? '对比'
                    : language === 'kr'
                    ? '비교'
                    : language === 'jp'
                    ? '比較'
                    : language === 'id'
                    ? 'Bandingkan'
                    : 'Compare'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Compare Mode View */}
        {isCompareMode ? (
          <CompareModeLayout
            language={language}
            drafts={drafts}
            initialDraftIds={compareInitialDrafts}
            addItem={addItem}
            mergeDrafts={mergeDrafts}
            getCalculatedItemsForDraft={getCalculatedItemsForDraft}
            getTotalsForDraft={getTotalsForDraft}
            updateItemInDraft={updateItemInDraft}
            removeItemFromDraft={removeItemFromDraft}
            setGlobalDiscountForDraft={setGlobalDiscountForDraft}
            onExitCompare={() => setIsCompareMode(false)}
            onExportCompare={handleCompareExport}
          />
        ) : (
          <>
            {/* Mobile Tabs */}
            <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0">
              <button
                onClick={() => setActiveMobileTab('catalog')}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeMobileTab === 'catalog' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                }`}
              >
                {language === 'zh'
                  ? '目录'
                  : language === 'kr'
                  ? '카탈로그'
                  : language === 'jp'
                  ? 'カタログ'
                  : language === 'id'
                  ? 'Katalog'
                  : 'Catalog'}
              </button>
              <button
                onClick={() => setActiveMobileTab('estimate')}
                className={`flex-1 py-3 text-sm font-medium ${
                  activeMobileTab === 'estimate' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                }`}
              >
                {language === 'zh'
                  ? `估算（${calculatedItems.length}）`
                  : language === 'kr'
                  ? `견적 (${calculatedItems.length})`
                  : language === 'jp'
                  ? `見積もり（${calculatedItems.length}）`
                  : language === 'id'
                  ? `Estimasi (${calculatedItems.length})`
                  : `Estimate (${calculatedItems.length})`}
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden relative">

              {/* Trash Zone Overlay (Only visible when dragging removal) */}
              {draggedItem?.type === 'remove-item' && (
                <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[1px]">
                  <TrashDroppable language={language} />
                </div>
              )}

              {/* Main Content Area (Left) - Service Catalog */}
              <main
                className={`flex-1 overflow-hidden p-4 lg:p-6 min-w-0 flex flex-col transition-colors ${
                  activeMobileTab === 'catalog' ? 'block' : 'hidden lg:flex'
                }`}
              >
                <ServiceCatalog language={language} onAddItem={addItem} />
              </main>

              {/* Drag Handle (Desktop only) */}
              <div
                className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-30 transition-colors hidden lg:block"
                onMouseDown={startResizing}
              ></div>

              {/* Right Sidebar: Estimate Slip */}
              <aside
                className={`lg:block h-full flex-shrink-0 ${
                  activeMobileTab === 'estimate' ? 'block w-full' : 'hidden'
                }`}
                style={{ width: activeMobileTab === 'estimate' ? '100%' : sidebarWidth }}
              >
                <EstimateSlip
                  language={language}
                  items={items}
                  calculatedItems={calculatedItems}
                  totals={totals}
                  globalDiscount={globalDiscount}
                  onUpdateItem={updateItem}
                  onRemoveItem={removeItem}
                  onGlobalDiscountChange={setGlobalDiscount}
                  onExport={handleExport}
                  onDraftDrop={handleDraftDrop}
                  discountMode={discountMode}
                  onDiscountModeChange={setDiscountMode}
                />
              </aside>
            </div>
          </>
        )}

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {draggedItem ? (
            draggedItem.type === 'add-service' ? (
              <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-blue-500 w-72 opacity-90 cursor-grabbing">
                <h4 className="font-bold text-gray-900">{draggedItem.name}</h4>
                <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-blue-50 text-xs font-bold text-blue-600">
                  {language === 'zh'
                    ? '加入估算'
                    : language === 'kr'
                    ? '견적에 추가'
                    : language === 'jp'
                    ? '見積もりに追加'
                    : language === 'id'
                    ? 'Tambah ke Estimasi'
                    : 'Add to Estimate'}
                </div>
              </div>
            ) : draggedItem.type === 'move-between-drafts' ? (
              <div className="bg-white p-4 rounded-xl shadow-2xl border-2 border-purple-500 w-72 opacity-90 cursor-grabbing">
                <div className="flex items-center">
                  <ArrowRightLeft className="w-5 h-5 mr-2 text-purple-600" />
                  <span className="font-bold text-gray-900">
                    {language === 'zh'
                      ? '移到草稿'
                      : language === 'kr'
                      ? '초안으로 이동'
                      : language === 'jp'
                      ? '下書きへ移動'
                      : language === 'id'
                      ? 'Pindahkan ke Draf'
                      : 'Move to Draft'}
                  </span>
                </div>
              </div>
            ) : draggedItem.type === 'compare-pane-drag' ? (
                <div className="bg-white p-3 rounded-lg shadow-2xl border-2 border-purple-500 w-48 opacity-90 cursor-grabbing flex items-center justify-center">
                   <GripVertical className="w-4 h-4 text-purple-600 rotate-90 mr-2" />
                   <span className="font-bold text-gray-900 uppercase text-xs tracking-widest">
                     {language === 'zh'
                       ? '移动 / 拖出'
                       : language === 'kr'
                       ? '이동 / 밖으로 드래그'
                       : language === 'jp'
                       ? '移動 / 外へドラッグ'
                       : language === 'id'
                       ? 'Pindah / Seret Keluar'
                       : 'Move / Drag Out'}
                   </span>
                </div>
            ) : (
              <div className="bg-red-500 p-4 rounded-xl shadow-2xl w-72 opacity-90 cursor-grabbing text-white flex items-center">
                <Trash2 className="w-6 h-6 mr-2" />
                <span className="font-bold">
                  {language === 'zh'
                    ? '删除项目'
                    : language === 'kr'
                    ? '항목 삭제'
                    : language === 'jp'
                    ? '項目を削除'
                    : language === 'id'
                    ? 'Hapus Item'
                    : 'Remove Item'}
                </span>
              </div>
            )
          ) : null}
        </DragOverlay>

        {/* Site-wide footer (copyright, disclaimer). shrink-0 so it never
            steals space from the calculator/estimate panes above. */}
        <Footer language={language} />

        {/* Floating AI Assistant trigger \u2014 renders its own modal; does not
            take layout space when closed. Mounted at the app shell level so
            it is accessible from both catalog mode and compare mode. */}
        <AiAssistant language={language} onAddItems={handleAiAddItems} />
      </div>
    </DndContext>
  );
}

export default App;
