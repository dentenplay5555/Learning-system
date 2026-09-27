"use client";

import { useState } from "react";
import { createInquiryAction } from "@/lib/actions";
import { INQUIRY_CATEGORIES } from "@/lib/validation/inquiry";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";

export interface InquiryContext {
  assignmentId?: string;
  assignmentTitle?: string;
  questionIndex?: number;
  questionPrompt?: string;
}

interface AskTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassId?: string;
  context?: InquiryContext | null;
  onSuccess?: () => void;
}

export default function AskTeacherModal({
  isOpen,
  onClose,
  defaultClassId = "class-m4-1",
  context,
  onSuccess,
}: AskTeacherModalProps) {
  const { showToast } = useToast();
  const [category, setCategory] = useState<"content" | "assignment" | "score" | "system" | "other">(
    context?.assignmentId ? "assignment" : "content"
  );
  const [title, setTitle] = useState(() => {
    if (context?.questionIndex && context?.assignmentTitle) {
      return `สงสัยข้อที่ ${context.questionIndex}: ${context.assignmentTitle}`;
    }
    if (context?.assignmentTitle) {
      return `สงสัยเกี่ยวกับ: ${context.assignmentTitle}`;
    }
    return "";
  });
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showToast("กรุณากรอกหัวข้อและรายละเอียด", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await createInquiryAction({
        classId: defaultClassId,
        category,
        title: title.trim(),
        content: content.trim(),
        context: context ? {
          assignmentId: context.assignmentId,
          assignmentTitle: context.assignmentTitle,
          questionIndex: context.questionIndex,
          questionPrompt: context.questionPrompt,
        } : undefined,
      });

      if (res.success) {
        showToast("ส่งคำถามถึงคุณครูเรียบร้อยแล้ว", "success");
        setTitle("");
        setContent("");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast(res.error || "ไม่สามารถส่งคำถามได้", "error");
      }
    } catch (err) {
      console.error("Submit inquiry failed:", err);
      showToast("เกิดข้อผิดพลาดในการส่งคำถาม", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1f6feb]/20 border border-[#1f6feb]/30 flex items-center justify-center text-lg">
              💬
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#f0f6fc]">
                ติดต่อครู / ถามข้อสงสัย
              </h3>
              <p className="text-[11px] font-mono text-[#8b949e]">
                ส่งตรงถึงคุณครูประจำวิชาของคุณ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] text-sm p-1 rounded-md hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Question Context Banner (If opened from a quiz question) */}
          {context && (
            <div className="rounded-xl border border-[#1f6feb]/30 bg-[#1f6feb]/10 p-3 text-xs space-y-1">
              <div className="font-semibold text-[#58a6ff] flex items-center gap-1.5">
                <span>📌</span>
                <span>แนบบริบทข้อสอบอัตโนมัติ</span>
              </div>
              <div className="text-[#c9d1d9] font-mono">
                {context.assignmentTitle && <div>งาน: {context.assignmentTitle}</div>}
                {context.questionIndex && <div>ข้อที่: {context.questionIndex}</div>}
                {context.questionPrompt && (
                  <div className="text-[11px] text-[#8b949e] truncate mt-0.5">
                    &quot;{context.questionPrompt}&quot;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. Category Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#c9d1d9]">
              เรื่องที่ต้องการติดต่อ
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {INQUIRY_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id as "content" | "assignment" | "score" | "system" | "other")}
                  className={`px-3 py-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                    category === cat.id
                      ? "border-[#58a6ff] bg-[#1f6feb]/15 text-[#f0f6fc] font-medium"
                      : "border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e] hover:text-[#c9d1d9]"
                  }`}
                >
                  <div className="font-semibold text-[13px]">{cat.label}</div>
                  <div className="text-[10px] text-[#8b949e] leading-tight mt-0.5">
                    {cat.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Topic / Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#c9d1d9]">
              หัวข้อคำถาม
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ไม่เข้าใจว่าทำไมต้องย้ายข้าง หรือ สงสัยการบ้านข้อ 3"
              className="w-full px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-sm text-[#f0f6fc] placeholder-[#5a5e72] focus:outline-none focus:border-[#58a6ff] transition-colors"
              required
            />
          </div>

          {/* 3. Content Details */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#c9d1d9]">
              รายละเอียดที่ต้องการสอบถาม
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="อธิบายจุดที่ไม่เข้าใจ หรือสิ่งที่ต้องการให้คุณครูอธิบายเพิ่มเติม..."
              className="w-full px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-sm text-[#f0f6fc] placeholder-[#5a5e72] focus:outline-none focus:border-[#58a6ff] transition-colors resize-none"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-medium border border-[#30363d] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-white" />
                  <span>กำลังส่ง...</span>
                </>
              ) : (
                <>
                  <span>ส่งข้อความ</span>
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
