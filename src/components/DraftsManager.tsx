import { Plus, X, Edit2, Check, GripVertical } from 'lucide-react';
import { useState, useRef, type DragEvent } from 'react';

interface DraftsManagerProps {
  drafts: Array<{ id: string; name: string }>;
  activeDraftId: string;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

// Draggable Draft Tab Component
function DraggableDraftTab({
  draft,
  isActive,
  canDelete,
  onSwitch,
  onDelete,
  onStartEdit,
  language,
}: {
  draft: { id: string; name: string };
  isActive: boolean;
  canDelete: boolean;
  onSwitch: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}) {
  const [isDragging, setIsDragging] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/x-edgeone-draft-tab', draft.id);
    event.dataTransfer.effectAllowed = 'move';
    if (tabRef.current) {
      event.dataTransfer.setDragImage(tabRef.current, 24, 16);
    }
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const t = {
    dragToCompare: {
      en: 'Drag to compare',
      zh: '拖拽对比',
      kr: '드래그해서 비교',
      jp: 'ドラッグで比較',
      id: 'Seret untuk membandingkan',
    }[language],
  };

  return (
    <div
      ref={tabRef}
      className={`flex items-center group relative min-w-[120px] max-w-[180px] h-10 px-3 rounded-t-lg border-b-2 transition-all ${
        isDragging
          ? 'shadow-xl bg-purple-100 border-purple-500 scale-[0.98]'
          : isActive
          ? 'bg-white border-blue-600 text-blue-700 shadow-sm z-10'
          : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
      }`}
    >
      {/* Drag Handle */}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 mr-1 text-gray-400 hover:text-gray-600"
        title={t.dragToCompare}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Tab Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => !isActive && onSwitch()}
      >
        <span className="text-sm font-medium truncate block">{draft.name}</span>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="flex items-center ml-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            className="p-1 hover:text-blue-800"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DraftsManager({
  drafts,
  activeDraftId,
  onCreate,
  onDelete,
  onSwitch,
  onRename,
  language,
}: DraftsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      {drafts.map((draft) => (
        editingId === draft.id ? (
          <div
            key={draft.id}
            className="flex items-center min-w-[120px] max-w-[180px] h-10 px-3 rounded-t-lg bg-white border-b-2 border-blue-600 shadow-sm"
          >
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveEditing}
              onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
              className="w-full bg-white px-1 py-0.5 text-sm border border-blue-300 rounded outline-none"
              autoFocus
            />
            <button onClick={saveEditing} className="ml-1 text-green-600 shrink-0">
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
            onDelete={() => onDelete(draft.id)}
            onStartEdit={() => startEditing(draft.id, draft.name)}
            language={language}
          />
        )
      ))}
      <button
        onClick={onCreate}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors shrink-0"
        title={
          language === 'zh'
            ? '新建草稿'
            : language === 'kr'
            ? '새 초안'
            : language === 'jp'
            ? '新規ドラフト'
            : language === 'id'
            ? 'Draf Baru'
            : 'New Draft'
        }
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
