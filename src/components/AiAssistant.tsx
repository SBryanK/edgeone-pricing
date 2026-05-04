import { useState, useRef, useEffect } from 'react';
import { Bot, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { getAiRecommendations, type AiRecommendation } from '../services/ai';

interface AiAssistantProps {
  onAddItems: (items: AiRecommendation[]) => void;
  language: 'en' | 'zh' | 'kr' | 'jp' | 'id';
}

export function AiAssistant({ onAddItems, language }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AiRecommendation[] | null>(null);

  // Keep a ref to the in-flight AbortController so both the cancel button
  // and the "Escape / close" action can interrupt long running requests.
  const abortRef = useRef<AbortController | null>(null);

  // Close the modal with Escape for better keyboard UX. We attach the
  // listener only while the modal is open to avoid a global keydown leak.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        abortRef.current?.abort();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const t = {
    title: {
      en: 'AI Assistant',
      zh: 'AI 助手',
      kr: 'AI 어시스턴트',
      jp: 'AI アシスタント',
      id: 'Asisten AI',
    }[language],
    askAi: {
      en: 'Ask AI',
      zh: '问问 AI',
      kr: 'AI에게 묻기',
      jp: 'AIに相談',
      id: 'Tanya AI',
    }[language],
    placeholder: {
      en: 'Describe your needs (e.g., "I need a plan for a game with 50TB traffic in Asia")',
      zh: '描述您的需求（例如：“我需要一个用于亚洲地区游戏业务的方案，流量50TB”）',
      kr: '요구 사항을 설명해주세요 (예: "아시아 지역 게임을 위한 50TB 트래픽 요금제가 필요합니다")',
      jp: 'ニーズを説明してください（例：「アジアでのゲーム用に50TBのトラフィックが必要です」）',
      id: 'Jelaskan kebutuhan Anda (contoh: "Butuh paket game dengan 50TB trafik di Asia")',
    }[language],
    generate: {
      en: 'Generate Quote',
      zh: '生成报价',
      kr: '견적 생성',
      jp: '見積もりを作成',
      id: 'Buat Penawaran',
    }[language],
    processing: {
      en: 'Analyzing...',
      zh: '分析中...',
      kr: '분석 중...',
      jp: '分析中...',
      id: 'Menganalisis...',
    }[language],
    success: {
      en: 'Items added successfully!',
      zh: '项目添加成功！',
      kr: '항목이 성공적으로 추가되었습니다!',
      jp: 'アイテムが正常に追加されました！',
      id: 'Item berhasil ditambahkan!',
    }[language],
    errorNoMatch: {
      en: 'No matching services found. Try describing differently.',
      zh: '未找到匹配的服务，请换种描述方式。',
      kr: '일치하는 서비스를 찾지 못했습니다. 다른 방식으로 설명해 보세요.',
      jp: '一致するサービスが見つかりませんでした。別の表現でお試しください。',
      id: 'Tidak menemukan layanan yang cocok. Coba jelaskan dengan cara lain.',
    }[language],
    errorFailed: {
      en: 'Failed to connect to AI. Please try again.',
      zh: '连接 AI 失败，请重试。',
      kr: 'AI 연결에 실패했습니다. 다시 시도해 주세요.',
      jp: 'AIへの接続に失敗しました。もう一度お試しください。',
      id: 'Gagal terhubung ke AI. Silakan coba lagi.',
    }[language],
    poweredBy: {
      en: 'Powered by AI',
      zh: '由 AI 提供支持',
      kr: 'AI 기반',
      jp: 'AI 提供',
      id: 'Didukung oleh AI',
    }[language],
    hint: {
      en: 'Tip: mention region, traffic volume, and business type for best results.',
      zh: '提示：包含地区、流量和业务类型以获得最佳结果。',
      kr: '팁: 최상의 결과를 위해 지역, 트래픽양, 비즈니스 유형을 포함하세요.',
      jp: 'ヒント：地域・トラフィック量・業種を含めると精度が向上します。',
      id: 'Tips: sebutkan region, jumlah trafik, dan jenis bisnis untuk hasil terbaik.',
    }[language],
    cancel: {
      en: 'Cancel',
      zh: '取消',
      kr: '취소',
      jp: 'キャンセル',
      id: 'Batal',
    }[language],
  };

  const renderAddedLine = (item: AiRecommendation) => {
    const qty = `${item.quantity} ${item.displayUnit || ''}`.trim();
    if (language === 'zh') {
      return (
        <>
          已添加 <b>{qty}</b> 的 {item.serviceId}
        </>
      );
    }
    if (language === 'kr') {
      return (
        <>
          추가됨: {item.serviceId} <b>{qty}</b>
        </>
      );
    }
    if (language === 'jp') {
      return (
        <>
          追加済み <b>{qty}</b>（{item.serviceId}）
        </>
      );
    }
    if (language === 'id') {
      return (
        <>
          Ditambahkan <b>{qty}</b> untuk {item.serviceId}
        </>
      );
    }
    return (
      <>
        Added <b>{qty}</b> of {item.serviceId}
      </>
    );
  };

  const handleGenerate = async () => {
    if (!query.trim() || isLoading) return;

    // Abort any previous in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const recommendations = await getAiRecommendations(query, controller.signal);
      // Guard against stale responses if user aborted mid-flight.
      if (controller.signal.aborted) return;
      if (recommendations.length > 0) {
        onAddItems(recommendations);
        setLastResult(recommendations);
        setQuery(''); // Clear input on success
      } else {
        setError(t.errorNoMatch);
      }
    } catch (err) {
      // Silently ignore user-initiated aborts — we don't want to flash an
      // error message when the user just hit cancel.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      // Surface the underlying error message in dev so users can self-diagnose
      // (e.g. 401 Unauthorized, quota exceeded). Keep it generic otherwise.
      const detail = err instanceof Error ? err.message : '';
      setError(import.meta.env.DEV && detail ? `${t.errorFailed} (${detail})` : t.errorFailed);
    } finally {
      // Only clear the loading flag if this is still the current request;
      // otherwise a newer request would have already taken over.
      if (abortRef.current === controller) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  };

  const handleClose = () => {
    // Abort any in-flight request when the user closes the dialog so we
    // don't eat tokens for a response nobody will see.
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:-translate-y-1'
        }`}
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="font-bold text-sm">{t.askAi}</span>
      </button>

      {/* Modal/Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto transition-opacity" 
            onClick={handleClose}
            aria-hidden="true"
          ></div>

          {/* Dialog */}
          <div
            className="bg-white w-full sm:w-[520px] sm:rounded-2xl shadow-2xl pointer-events-auto transform transition-all animate-in fade-in slide-in-from-bottom-4 flex flex-col max-h-[85vh] sm:mb-8 border border-gray-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assistant-title"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 sm:rounded-t-2xl">
              <div className="flex items-center space-x-2 text-blue-700">
                <Bot className="w-6 h-6" />
                <h3 id="ai-assistant-title" className="font-bold text-lg">{t.title}</h3>
              </div>
              <button
                onClick={handleClose}
                aria-label={t.cancel}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white/70 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Success Message */}
              {lastResult && (
                <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-start space-x-3 text-sm animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{t.success}</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs opacity-90">
                      {lastResult.map((item, idx) => (
                        <li key={idx}>
                          {renderAddedLine(item)}
                          {item.reasoning && <span className="block text-green-600/80 italic font-normal">"{item.reasoning}"</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.placeholder}
                  disabled={isLoading}
                  maxLength={1000}
                  className="w-full h-32 p-4 pb-10 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-gray-700 text-sm bg-gray-50 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  autoFocus
                  aria-label={t.title}
                />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
                   <span className="text-[10px] text-gray-400 font-medium">{t.poweredBy}</span>
                   <span className="text-[10px] text-gray-400 font-medium tabular-nums">{query.length}/1000</span>
                </div>
              </div>

              {/* Empty-state hint shown before the first successful run */}
              {!lastResult && !error && (
                <p className="text-[11px] text-gray-500 leading-relaxed -mt-1">
                  💡 {t.hint}
                </p>
              )}

              <div className="flex items-center space-x-2">
                {isLoading && (
                  <button
                    onClick={handleCancel}
                    type="button"
                    className="px-4 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]"
                  >
                    {t.cancel}
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !query.trim()}
                  className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center space-x-2 transition-all ${
                    isLoading || !query.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]'
                  }`}
                >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.processing}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{t.generate}</span>
                  </>
                )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
