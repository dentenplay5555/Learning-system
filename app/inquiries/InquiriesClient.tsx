"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AskTeacherModal from "@/components/AskTeacherModal";
import { closeInquiryAction } from "@/lib/actions";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";

interface InquiryItem {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  category: string;
  title: string;
  content: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  reply?: string | null;
  answeredBy?: string | null;
  answeredAt?: string | null;
  createdAt: string;
  context?: {
    assignmentId?: string;
    assignmentTitle?: string;
    questionIndex?: number;
    questionPrompt?: string;
  } | null;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  content: { label: "สงสัยเนื้อหา", icon: "❓" },
  assignment: { label: "สงสัยเกี่ยวกับงาน", icon: "📝" },
  score: { label: "สอบถามคะแนน", icon: "📊" },
  system: { label: "แจ้งปัญหาระบบ", icon: "🛠️" },
  other: { label: "อื่น ๆ", icon: "💬" },
};

export default function InquiriesClient({
  initialInquiries,
  defaultClassId,
}: {
  initialInquiries: InquiryItem[];
  defaultClassId: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "ANSWERED" | "CLOSED">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const openCount = initialInquiries.filter((q) => q.status === "OPEN").length;
  const answeredCount = initialInquiries.filter((q) => q.status === "ANSWERED").length;
  const closedCount = initialInquiries.filter((q) => q.status === "CLOSED").length;

  const filteredInquiries = initialInquiries.filter((item) => {
    if (filter === "ALL") return true;
    return item.status === filter;
  });

  const handleCloseInquiry = async (id: string) => {
    try {
      setClosingId(id);
      const res = await closeInquiryAction(id);
      if (res.success) {
        showToast("ปิดคำถามเรียบร้อยแล้ว", "success");
        router.refresh();
      } else {
        showToast(res.error || "ไม่สามารถปิดคำถามได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการปิดคำถาม", "error");
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div>
          <div className="text-xs font-mono text-[#8b949e] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1f6feb]" />
            <span>student-desk / inquiries</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f0f6fc] mt-1">
            💬 ติดต่อคุณครู & คำถามของฉัน
          </h1>
          <p className="text-[13px] text-[#8b949e]">
            ส่งข้อสงสัยในบทเรียน แบบฝึกหัด หรือปัญหาการใช้งานถึงคุณครูผู้สอน
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-xs font-medium shadow-sm transition-all cursor-pointer shrink-0"
        >
          <span>💬</span>
          <span>ถามคำถามใหม่</span>
        </button>
      </div>

      {/* ─── Metric Pills ─── */}
      <div className="grid grid-cols-3 gap-3">
        <div
          onClick={() => setFilter("OPEN")}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            filter === "OPEN"
              ? "border-[#f85149] bg-[#da3633]/15 shadow-sm"
              : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
          }`}
        >
          <div className="text-[11px] font-mono text-[#8b949e]">รอครูตอบ</div>
          <div className="text-2xl font-bold text-[#f85149] mt-0.5">{openCount}</div>
        </div>

        <div
          onClick={() => setFilter("ANSWERED")}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            filter === "ANSWERED"
              ? "border-[#d29922] bg-[#d29922]/15 shadow-sm"
              : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
          }`}
        >
          <div className="text-[11px] font-mono text-[#8b949e]">ครูตอบแล้ว</div>
          <div className="text-2xl font-bold text-[#d29922] mt-0.5">{answeredCount}</div>
        </div>

        <div
          onClick={() => setFilter("CLOSED")}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            filter === "CLOSED"
              ? "border-[#3fb950] bg-[#238636]/15 shadow-sm"
              : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
          }`}
        >
          <div className="text-[11px] font-mono text-[#8b949e]">ปิดคำถามแล้ว</div>
          <div className="text-2xl font-bold text-[#3fb950] mt-0.5">{closedCount}</div>
        </div>
      </div>

      {/* ─── Filter Tabs ─── */}
      <div className="flex items-center gap-1.5 border-b border-[#30363d] pb-2 text-xs font-mono">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            filter === "ALL"
              ? "bg-[#21262d] text-[#f0f6fc] font-semibold border border-[#30363d]"
              : "text-[#8b949e] hover:text-[#f0f6fc]"
          }`}
        >
          ทั้งหมด ({initialInquiries.length})
        </button>
        <button
          onClick={() => setFilter("OPEN")}
          className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            filter === "OPEN"
              ? "bg-[#da3633]/20 text-[#f85149] font-semibold border border-[#da3633]/40"
              : "text-[#8b949e] hover:text-[#f0f6fc]"
          }`}
        >
          🔴 รอคำตอบ ({openCount})
        </button>
        <button
          onClick={() => setFilter("ANSWERED")}
          className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            filter === "ANSWERED"
              ? "bg-[#d29922]/20 text-[#d29922] font-semibold border border-[#d29922]/40"
              : "text-[#8b949e] hover:text-[#f0f6fc]"
          }`}
        >
          🟡 ได้รับคำตอบแล้ว ({answeredCount})
        </button>
        <button
          onClick={() => setFilter("CLOSED")}
          className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            filter === "CLOSED"
              ? "bg-[#238636]/20 text-[#3fb950] font-semibold border border-[#238636]/40"
              : "text-[#8b949e] hover:text-[#f0f6fc]"
          }`}
        >
          🟢 ปิดแล้ว ({closedCount})
        </button>
      </div>

      {/* ─── List of Inquiries ─── */}
      {filteredInquiries.length === 0 ? (
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-12 text-center space-y-3">
          <div className="text-3xl">💬</div>
          <div className="text-sm font-semibold text-[#f0f6fc]">
            ยังไม่มีคำถามในหมวดนี้
          </div>
          <p className="text-xs text-[#8b949e] max-w-sm mx-auto">
            หากคุณมีข้อสงสัยเกี่ยวกับเนื้อหา โจทย์ หรือผลคะแนน สามารถกดปุ่ม &quot;ถามคำถามใหม่&quot; ได้ตลอดเวลา
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#f0f6fc] font-medium transition-colors cursor-pointer"
          >
            + ถามคุณครูตอนนี้
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((item) => {
            const cat = CATEGORY_MAP[item.category] || { label: item.category, icon: "💬" };

            return (
              <div
                key={item.id}
                className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-3.5 hover:border-[#58a6ff]/40 transition-colors shadow-sm"
              >
                {/* Inquiry Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-xs font-semibold text-[#f0f6fc]">
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e]">
                      {item.classId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "OPEN" && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#da3633]/15 text-[#f85149] border border-[#da3633]/30 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f85149] animate-pulse" />
                        รอครูตอบ
                      </span>
                    )}
                    {item.status === "ANSWERED" && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/30 font-semibold">
                        ครูตอบแล้ว
                      </span>
                    )}
                    {item.status === "CLOSED" && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30">
                        ปิดคำถามแล้ว
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-[#8b949e]">
                      {item.createdAt}
                    </span>
                  </div>
                </div>

                {/* Question Context Banner */}
                {item.context && (
                  <div className="rounded-lg border border-[#1f6feb]/25 bg-[#1f6feb]/8 px-3 py-2 text-xs font-mono text-[#58a6ff] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span>📌</span>
                      <span className="truncate">
                        {item.context.assignmentTitle || "แบบฝึกหัด"}
                        {item.context.questionIndex !== undefined &&
                          ` • ข้อที่ ${item.context.questionIndex}`}
                      </span>
                    </div>
                    {item.context.assignmentId && (
                      <Link
                        href={`/dashboard/${item.context.assignmentId}`}
                        className="text-[11px] text-[#79c0ff] hover:underline shrink-0"
                      >
                        เปิดดูข้อสอบ →
                      </Link>
                    )}
                  </div>
                )}

                {/* Question Title & Content */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-[#f0f6fc]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>

                {/* Teacher's Reply Box (If answered) */}
                {item.reply ? (
                  <div className="rounded-xl border border-[#238636]/30 bg-[#238636]/8 p-4 space-y-2 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-[#3fb950] flex items-center gap-1.5">
                        <span>👨‍🏫</span>
                        <span>
                          {item.answeredBy || "คุณครู"} ได้ตอบกลับ:
                        </span>
                      </div>
                      {item.answeredAt && (
                        <span className="text-[10px] font-mono text-[#8b949e]">
                          {item.answeredAt}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#f0f6fc] leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-[#3fb950]">
                      {item.reply}
                    </div>

                    {/* Close Action Button if not closed yet */}
                    {item.status === "ANSWERED" && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCloseInquiry(item.id)}
                          disabled={closingId === item.id}
                          className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs font-mono text-[#3fb950] hover:text-white border border-[#30363d] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {closingId === item.id ? (
                            <Spinner className="w-3 h-3 text-[#3fb950]" />
                          ) : (
                            <span>✓</span>
                          )}
                          <span>เข้าใจแล้ว (ปิดคำถาม)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-[#8b949e] italic pt-1">
                    คำถามนี้อยู่ระหว่างรอคุณครูประจำวิชาเข้ามาตรวจสอบและตอบกลับ
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AskTeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultClassId={defaultClassId}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
