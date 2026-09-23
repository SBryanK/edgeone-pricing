import { useState, useCallback, useRef, useEffect, type DragEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Plus, X, Columns2, Columns3, GripVertical, Download } from 'lucide-react';
import { CompareEstimatePane } from './CompareEstimatePane';
import type { Draft } from '../hooks/useCalculator';
import type { CalculatedItem, CalculatorInput, TierMode } from '../types';

interface CompareViewProps {
  drafts: Draft[];
  initialDraftIds?: string[];
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
  onChangeDraft: (paneIndex: number, draftId: string) => void;
  onMergeDrafts: (sourceDraftId: string, targetDraftId: string) => void;
  getCalculatedItemsForDraft: (draftId: string) => CalculatedItem[];
  getTotalsForDraft: (draftId: string) => { monthly: number; annual: number };
  getTierModeForDraft: (draftId: string) => TierMode;
  updateItemInDraft: (draftId: string, index: number, updates: Partial<CalculatorInput>) => void;
  removeItemFromDraft: (draftId: string, index: number) => void;
  setGlobalDiscountForDraft: (draftId: string, discount: number) => void;
  onExitCompare: () => void;
  /**
   * When provided, renders an "Export All" button in the compare-mode header
   * that triggers a multi-sheet .xlsx export (one sheet per draft + a summary).
   * Receives the draft IDs currently displayed in the panes (in pane order),
   * so only the drafts the user is actively comparing get exported.
   */
  onExportCompare?: (visibleDraftIds: string[]) => void;
}

interface PaneConfig {
  draftId: string;
  width: number; // percentage
}

// Draggable Header Component for Pane
function DraggablePaneHeader({ 
  index, 
  isDraggingOverlay = false 
}: { 
  index: number; 
  isDraggingOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `compare-pane-header-${index}`,
    data: {
      type: 'compare-pane-drag',
      paneIndex: index,
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: 0.8,
    zIndex: 1000,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-center py-1 bg-gray-100 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none hover:bg-gray-200 transition-colors ${
        isDragging ? 'opacity-0' : ''
      } ${isDraggingOverlay ? 'w-48 rounded-lg shadow-xl border-2 border-purple-500 bg-white' : ''}`}
    >
      <GripVertical className="w-4 h-4 text-gray-400 rotate-90" />
    </div>
  );
}

export function CompareView({
  drafts,
  initialDraftIds,
  language,
  onChangeDraft,
  onMergeDrafts,
  getCalculatedItemsForDraft,
  getTotalsForDraft,
  getTierModeForDraft,
  updateItemInDraft,
  removeItemFromDraft,
  setGlobalDiscountForDraft,
  onExitCompare,
  onExportCompare,
}: CompareViewProps) {
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

  // Initialize with first draft, or first two if available
  const [panes, setPanes] = useState<PaneConfig[]>(() => {
    if (initialDraftIds && initialDraftIds.length > 0) {
       const count = Math.min(initialDraftIds.length, 3);
       const width = 100 / count;
       return initialDraftIds.slice(0, count).map(id => ({ draftId: id, width }));
    }

    if (drafts.length >= 2) {
      return [
        { draftId: drafts[0].id, width: 50 },
        { draftId: drafts[1].id, width: 50 },
      ];
    }
    return [{ draftId: drafts[0]?.id || '', width: 100 }];
  });

  // Reordering state (managed by App.tsx, but used here for highlight)
  const draggedPaneIndex = null; // Placeholder to fix build error, or handle reordering locally if needed
  const dropTargetIndex = null;

  // Resize state
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraftDragOver, setIsDraftDragOver] = useState(false);

  const t = {
    compareTitle: { en: 'Compare Drafts', zh: '草稿对比', kr: '초안 비교', jp: 'ドラフト比較', id: 'Bandingkan Draf' }[language],
    addPane: { en: 'Add Pane', zh: '添加面板', kr: '패널 추가', jp: 'パネル追加', id: 'Tambah Panel' }[language],
    exitCompare: { en: 'Exit Compare', zh: '结束对比', kr: '비교 종료', jp: '比較を終了', id: 'Keluar dari Perbandingan' }[language],
    exportAll: { en: 'Export All', zh: '全部导出', kr: '전체 내보내기', jp: 'すべてエクスポート', id: 'Ekspor Semua' }[language],
    maxPanes: { en: 'Max 3 panes', zh: '最多 3 个面板', kr: '최대 3개 패널', jp: '最大3パネル', id: 'Maks. 3 panel' }[language],
    dragToReorder: { en: 'Drag to reorder', zh: '拖拽调整顺序', kr: '드래그하여 재정렬', jp: 'ドラッグで並べ替え', id: 'Seret untuk mengurutkan' }[language],
    dropToAdd: { en: 'Drop Draft Here to Add', zh: '拖放草稿到此添加', kr: '추가할 초안을 여기로 놓으세요', jp: '追加する下書きをここにドロップ', id: 'Lepas draf di sini untuk menambahkannya' }[language],
  };

  // Recalculate widths when pane count changes
  const redistributeWidths = useCallback((paneCount: number) => {
    const equalWidth = 100 / paneCount;
    return Array(paneCount).fill(equalWidth);
  }, []);

  const addPane = useCallback(() => {
    if (panes.length >= 3) return;

    const usedDraftIds = new Set(panes.map(p => p.draftId));
    const unusedDraft = drafts.find(d => !usedDraftIds.has(d.id));
    const newDraftId = unusedDraft?.id || drafts[0]?.id || '';

    const newWidths = redistributeWidths(panes.length + 1);
    setPanes(prev => [
      ...prev.map((p, i) => ({ ...p, width: newWidths[i] })),
      { draftId: newDraftId, width: newWidths[panes.length] },
    ]);
  }, [panes, drafts, redistributeWidths]);

  // Handle adding a specific draft (via drag & drop)
  const addPaneWithDraft = useCallback((draftId: string) => {
    if (panes.length >= 3) return;
    
    // Check if already in panes
    if (panes.some(p => p.draftId === draftId)) return;

    const newWidths = redistributeWidths(panes.length + 1);
    setPanes(prev => [
      ...prev.map((p, i) => ({ ...p, width: newWidths[i] })),
      { draftId: draftId, width: newWidths[panes.length] },
    ]);
  }, [panes, redistributeWidths]);

  const isDraftTransfer = (event: DragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer.types || []).includes('application/x-edgeone-draft-tab');

  const handleNativeDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!isDraftTransfer(event) || panes.length >= 3) return;
    event.preventDefault();
    setIsDraftDragOver(true);
  };

  const handleNativeDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isDraftTransfer(event) || panes.length >= 3) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleNativeDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!isDraftTransfer(event)) return;
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDraftDragOver(false);
    }
  };

  const handleNativeDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isDraftTransfer(event) || panes.length >= 3) return;
    event.preventDefault();
    setIsDraftDragOver(false);
    const draftId = event.dataTransfer.getData('application/x-edgeone-draft-tab');
    if (draftId) addPaneWithDraft(draftId);
  };

  // Expose this to App.tsx via a ref or just use a shared state?
  // Actually, App.tsx can just use a prop to trigger addition.
  // But let's handle it internally if possible or via effect.

  const removePane = useCallback((paneIndex: number) => {
    if (panes.length <= 1) {
      onExitCompare();
      return;
    }

    const newPanes = panes.filter((_, i) => i !== paneIndex);
    const newWidths = redistributeWidths(newPanes.length);
    setPanes(newPanes.map((p, i) => ({ ...p, width: newWidths[i] })));
  }, [panes, redistributeWidths, onExitCompare]);

  // Logic to handle external addition (dropped from App)
  useEffect(() => {
    const handleCustomAdd = (event: Event) => {
      const customEvent = event as CustomEvent<{ draftId?: string }>;
      if (customEvent.detail?.draftId) {
        addPaneWithDraft(customEvent.detail.draftId);
      }
    };
    window.addEventListener('compare-view-add-draft', handleCustomAdd);
    return () => window.removeEventListener('compare-view-add-draft', handleCustomAdd);
  }, [addPaneWithDraft]);

  // Logic to handle external removal (dropped outside)
  useEffect(() => {
    const handleCustomRemove = (event: Event) => {
      const customEvent = event as CustomEvent<{ paneIndex?: number }>;
      if (typeof customEvent.detail?.paneIndex === 'number') {
        removePane(customEvent.detail.paneIndex);
      }
    };
    window.addEventListener('compare-view-remove-pane', handleCustomRemove);
    return () => window.removeEventListener('compare-view-remove-pane', handleCustomRemove);
  }, [removePane]);

  // Auto-exit compare mode when only 1 pane remains
  useEffect(() => {
    if (panes.length <= 1) {
      onExitCompare();
    }
  }, [panes.length, onExitCompare]);

  const handleChangeDraft = useCallback((paneIndex: number, draftId: string) => {
    setPanes(prev => prev.map((pane, i) =>
      i === paneIndex ? { ...pane, draftId } : pane
    ));
    onChangeDraft(paneIndex, draftId);
  }, [onChangeDraft]);

  const handleResizeStart = useCallback((index: number) => {
    setResizingIndex(index);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMergePane = useCallback((sourcePaneIndex: number, targetPaneIndex: number) => {
    const sourceDraftId = panes[sourcePaneIndex]?.draftId;
    const targetDraftId = panes[targetPaneIndex]?.draftId;

    if (sourceDraftId && targetDraftId && sourceDraftId !== targetDraftId) {
      onMergeDrafts(sourceDraftId, targetDraftId);
    }
  }, [panes, onMergeDrafts]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (resizingIndex === null || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    const mousePercent = (mouseX / containerWidth) * 100;

    // Calculate cumulative width up to the resize handle
    let cumulativeWidth = 0;
    for (let i = 0; i < resizingIndex; i++) {
      cumulativeWidth += panes[i].width;
    }

    // New width for left pane
    let newLeftWidth = mousePercent - cumulativeWidth;
    // New width for right pane
    const currentRightWidth = panes[resizingIndex + 1]?.width || 0;
    const totalWidth = panes[resizingIndex].width + currentRightWidth;
    let newRightWidth = totalWidth - newLeftWidth;

    // Minimum width constraints (20%)
    const minWidth = 25;
    if (newLeftWidth < minWidth) {
      newLeftWidth = minWidth;
      newRightWidth = totalWidth - minWidth;
    }
    if (newRightWidth < minWidth) {
      newRightWidth = minWidth;
      newLeftWidth = totalWidth - minWidth;
    }

    setPanes(prev => prev.map((p, i) => {
      if (i === resizingIndex) return { ...p, width: newLeftWidth };
      if (i === resizingIndex + 1) return { ...p, width: newRightWidth };
      return p;
    }));
  }, [resizingIndex, panes]);

  const handleResizeEnd = useCallback(() => {
    setResizingIndex(null);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    if (resizingIndex !== null) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingIndex, handleResizeMove, handleResizeEnd]);

  return (
    <div
      onDragEnter={handleNativeDragEnter}
      onDragOver={handleNativeDragOver}
      onDragLeave={handleNativeDragLeave}
      onDrop={handleNativeDrop}
      className="flex flex-col h-full bg-gray-100 relative"
    >
      {/* Overlay for dropping draft tab */}
      {isDraftDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-[2px] flex items-center justify-center border-4 border-dashed border-blue-400">
           <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
              <Plus className="w-12 h-12 text-blue-600 mb-2 animate-bounce" />
              <span className="text-xl font-bold text-gray-900">{t.dropToAdd}</span>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {panes.length === 2 ? (
              <Columns2 className="w-5 h-5 text-blue-600" />
            ) : panes.length === 3 ? (
              <Columns3 className="w-5 h-5 text-blue-600" />
            ) : (
              <div className="w-5 h-5 border-2 border-blue-600 rounded" />
            )}
            <h2 className="text-lg font-bold text-gray-900">{t.compareTitle}</h2>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {panes.length}/3 {language === 'zh' ? '个面板' : language === 'kr' ? '패널' : language === 'jp' ? 'パネル' : language === 'id' ? 'panel' : 'panes'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export All Button (multi-sheet .xlsx) */}
          {onExportCompare && (
            <button
              onClick={() => onExportCompare(panes.map((p) => p.draftId).filter(Boolean))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              title={t.exportAll}
            >
              <Download className="w-4 h-4" />
              <span>{t.exportAll}</span>
            </button>
          )}

          {/* Add Pane Button */}
          <button
            onClick={addPane}
            disabled={panes.length >= 3}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              panes.length >= 3
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
            title={panes.length >= 3 ? t.maxPanes : t.addPane}
          >
            <Plus className="w-4 h-4" />
            <span>{t.addPane}</span>
          </button>

          {/* Exit Compare Button */}
          <button
            onClick={onExitCompare}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>{t.exitCompare}</span>
          </button>
        </div>
      </div>

      {/* Panes Container */}
      <div
        ref={containerRef}
        className={`flex-1 ${isCompactCompare ? 'flex flex-col overflow-y-auto gap-3 p-3' : 'flex overflow-hidden'} relative`}
      >
        {panes.map((pane, index) => {
          const draft = drafts.find(d => d.id === pane.draftId);
          if (!draft) return null;

          const calculatedItems = getCalculatedItemsForDraft(draft.id);
          const totals = getTotalsForDraft(draft.id);
          const otherPaneIndices = panes.map((_, i) => i).filter(i => i !== index);
          const isDragging = draggedPaneIndex === index;
          const isDropTarget = dropTargetIndex === index;

          return (
            <div
              key={`pane-wrapper-${index}`}
              className={`${isCompactCompare ? 'w-full' : 'flex h-full'}`}
              style={{ width: isCompactCompare ? '100%' : `${pane.width}%` }}
            >
              {/* Pane */}
              <div
                className={`flex-1 min-w-0 flex flex-col transition-all ${
                  isDragging ? 'opacity-50 scale-[0.98]' : ''
                } ${isDropTarget ? 'ring-2 ring-inset ring-purple-400' : ''} ${
                  isCompactCompare && index > 0 ? 'border-t border-gray-200' : ''
                }`}
                style={{
                  borderLeft: !isCompactCompare && index > 0 ? '1px solid #e5e7eb' : 'none',
                }}
              >
                {/* Draggable Header */}
                <DraggablePaneHeader index={index} />

                {/* Pane Content */}
                <div className="flex-1 min-h-0">
                  <CompareEstimatePane
                    draft={draft}
                    calculatedItems={calculatedItems}
                    totals={totals}
                    tierMode={getTierModeForDraft(draft.id)}
                    language={language}
                    paneIndex={index}
                    allDrafts={drafts}
                    onChangeDraft={handleChangeDraft}
                    onRemovePane={removePane}
                    onMergePane={handleMergePane}
                    onUpdateItem={updateItemInDraft}
                    onRemoveItem={removeItemFromDraft}
                    onSetGlobalDiscount={setGlobalDiscountForDraft}
                    canRemove={panes.length > 1}
                    otherPaneIndices={otherPaneIndices}
                    isCompact={isCompactCompare}
                  />
                </div>
              </div>

              {/* Resize Handle (between panes) */}
              {!isCompactCompare && index < panes.length - 1 && (
                <div
                  className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize z-10 transition-colors shrink-0 ${
                    resizingIndex === index ? 'bg-blue-500' : ''
                  }`}
                  onMouseDown={() => handleResizeStart(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
