import { Plus, X, Edit2, Check, GripVertical, Copy } from 'lucide-react';
import { useState, useRef, type DragEvent } from 'react';
import type { Language } from '../types';

interface DraftsManagerProps {
  drafts: Array<{ id: string; name: string; items: unknown[] }>;
  activeDraftId: string;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  language: Language;
}

const TEXT = {
  dragToCompare: {
    en: 'Drag onto the estimate to compare',
    zh: '拖到估算单进行对比',
    kr: '견적으로 드래그해서 비교',
    jp: '見積もりへドラッグして比較',
    id: 'Seret ke estimasi untuk membandingkan',
  },
  rename: { en: 'Rename draft', zh: '重命名草稿', kr: '초안 이름 변경', jp: '下書き名を変更', id: 'Ganti nama draf' },
  duplicate: { en: 'Duplicate draft', zh: '复制草稿', kr: '초안 복제', jp: '下書きを複製', id: 'Duplikat draf' },
  remove: { en: 'Delete draft', zh: '删除草稿', kr: '초안 삭제', jp: '下書きを削除', id: 'Hapus draf' },
  newDraft: { en: 'New draft', zh: '新建草稿', kr: '새 초안', jp: '新規下書き', id: 'Draf baru' },
  confirmDelete: {
    en: 'Delete "{name}" and its {n} item(s)?',
    zh: '删除“{name}”及其 {n} 个项目？',
    kr: '"{name}"과(와) 항목 {n}개를 삭제할까요?',
    jp: '「{name}」と {n} 件の項目を削除しますか？',
    id: 'Hapus "{name}" beserta {n} item?',
  },
  save: { en: 'Save name', zh: '保存名称', kr: '이름 저장', jp: '名前を保存', id: 'Simpan nama' },
};

function DraggableDraftTab({
  draft,
  isActive,
  canDelete,
  onSwitch,
  onDelete,
  onDuplicate,
  onStartEdit,
  language,
}: {
  draft: { id: string; name: string };
  isActive: boolean;
  canDelete: boolean;
  onSwitch: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStartEdit: () => void;
  language: Language;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/x-edgeone-draft-tab', draft.id);
    event.dataTransfer.effectAllowed = 'move';
    if (tabRef.current) event.dataTransfer.setDragImage(tabRef.current, 24, 16);
    setIsDragging(true);
  };

  const actionBtn = 'p-1 rounded hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

  return (
    <div
      ref={tabRef}
      className={`flex items-center group relative min-w-[120px] max-w-[220px] h-10 px-2 rounded-t-lg border-b-2 transition-all ${
        isDragging
          ? 'shadow-xl bg-purple-100 border-purple-500 scale-[0.98]'
          : isActive
          ? 'bg-white border-blue-600 text-blue-700 shadow-sm z-10'
          : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
      }`}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setIsDragging(false)}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
        title={TEXT.dragToCompare[language]}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        className="flex-1 min-w-0 text-left text-sm font-medium truncate px-1 focus:outline-none focus-visible:underline"
        onClick={() => !isActive && onSwitch()}
        onDoubleClick={onStartEdit}
        title={draft.name}
      >
        {draft.name}
      </button>

      {isActive && (
        <div className="flex items-center shrink-0">
          <button type="button" onClick={onStartEdit} className={`${actionBtn} hover:text-blue-800`} aria-label={TEXT.rename[language]} title={TEXT.rename[language]}>
            <Edit2 className="w-3 h-3" />
          </button>
          <button type="button" onClick={onDuplicate} className={`${actionBtn} hover:text-blue-800`} aria-label={TEXT.duplicate[language]} title={TEXT.duplicate[language]}>
            <Copy className="w-3 h-3" />
          </button>
          {canDelete && (
            <button type="button" onClick={onDelete} className={`${actionBtn} hover:text-red-600`} aria-label={TEXT.remove[language]} title={TEXT.remove[language]}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DraftsManager({ drafts, activeDraftId, onCreate, onDuplicate, onDelete, onSwitch, onRename, language }: DraftsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) onRename(editingId, editName.trim().slice(0, 60));
    setEditingId(null);
  };

  const confirmDelete = (draft: { id: string; name: string; items: unknown[] }) => {
    // Empty drafts go without asking; drafts with content need confirmation.
    if (draft.items.length > 0) {
      const msg = TEXT.confirmDelete[language].replace('{name}', draft.name).replace('{n}', String(draft.items.length));
      if (!window.confirm(msg)) return;
    }
    onDelete(draft.id);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide min-w-0" role="tablist" aria-label="Drafts">
      {drafts.map((draft) =>
        editingId === draft.id ? (
          <div key={draft.id} className="flex items-center min-w-[140px] max-w-[220px] h-10 px-2 rounded-t-lg bg-white border-b-2 border-blue-600 shadow-sm">
            <input
              type="text"
              value={editName}
              maxLength={60}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') setEditingId(null);
              }}
              aria-label={TEXT.rename[language]}
              className="w-full bg-white px-1 py-0.5 text-sm border border-blue-300 rounded outline-none"
              autoFocus
            />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={saveEditing} className="ml-1 text-green-600 shrink-0" aria-label={TEXT.save[language]}>
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <DraggableDraftTab
            key={draft.id}
            draft={draft}
            isActive={activeDraftId === draft.id}
            canDelete={drafts.length > 1}
            onSwitch={() => onSwitch(draft.id)}
            onDelete={() => confirmDelete(draft)}
            onDuplicate={() => onDuplicate(draft.id)}
            onStartEdit={() => startEditing(draft.id, draft.name)}
            language={language}
          />
        )
      )}
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        title={TEXT.newDraft[language]}
        aria-label={TEXT.newDraft[language]}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
