"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { replyInquiryAction } from "@/lib/actions";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/Spinner";

interface InquiryItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
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

export default function TeacherInquiriesClient({
  initialInquiries,
  classes,
  teacherName,
}: {
  initialInquiries: InquiryItem[];
  classes: string[];
  teacherName: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "ANSWERED" | "CLOSED">("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Reply state mapped by inquiryId
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<"ANSWERED" | "CLOSED">("ANSWERED");
  const [replying, setReplying] = useState(false);

  const openCount = initialInquiries.filter((q) => q.status === "OPEN").length;
  const answeredCount = initialInquiries.filter((q) => q.status === "ANSWERED").length;
  const closedCount = initialInquiries.filter((q) => q.status === "CLOSED").length;

  const filtered = initialInquiries.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (classFilter !== "ALL" && item.classId !== classFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchContent) return false;
    }
    return true;
  });

  const handleOpenReply = (item: InquiryItem) => {
    setActiveReplyId(item.id);
    setReplyText(item.reply || "");
    setReplyStatus("ANSWERED");
  };

  const handleSendReply = async (inquiryId: string) => {
    if (!replyText.trim()) {
      showToast("กรุณากรอกข้อความตอบกลับ", "error");
      return;
    }

    try {
      setReplying(true);
      const res = await replyInquiryAction({
        inquiryId,
        reply: replyText.trim(),
        newStatus: replyStatus,
      });

      if (res.success) {
        showToast("ส่งคำตอบให้นักเรียนเรียบร้อยแล้ว", "success");
        setActiveReplyId(null);
        setReplyText("");
        router.refresh();
      } else {
        showToast(res.error || "ไม่สามารถตอบกลับได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการตอบกลับ", "error");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div>
          <div className="text-xs font-mono text-[#8b949e] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            <span>teacher-inbox / inquiries</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f0f6fc] mt-1">
            💬 ข้อความและข้อสงสัยจากนักเรียน
          </h1>
          <p className="text-[13px] text-[#8b949e]">
            ยินดีต้อนรับอาจารย์ {teacherName} • ตอบคำถาม ให้คำแนะนำ และติดตามปัญหาของนักเรียน
          </p>
        </div>

        <Link
          href="/teacher"
          className="text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors shrink-0"
        >
          ← กลับหน้าแดชบอร์ดครู
        </Link>
      </div>

      {/* ─── Status Metric Cards (User requested format) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 🔴 OPEN */}
        <div
          onClick={() => setStatusFilter("OPEN")}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === "OPEN"
              ? "border-[#f85149] bg-[#da3633]/15 shadow-sm"
              : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono text-[#8b949e]">🔴 ยังไม่ได้ตอบ</div>
            {openCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#f85149] animate-pulse" />
            )}
          </div>
          <div className="text-3xl font-bold text-[#f85149] mt-1">{openCount}</div>
          <div className="text-[11px] text-[#8b949e] mt-1 font-mono">
            ต้องการคำตอบจากคุณครู
          </div>
        </div>

        {/* 🟡 ANSWERED */}
        <div
          onClick={() => setStatusFilter("ANSWERED")}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === "ANSWERED"
              ? "border-[#d29922] bg-[#d29922]/15 shadow-sm"
              : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
          }`}
        >
          <div className="text-[11px] font-mono text-[#8b949e]">🟡 กำลังดำเนินการ / ตอบแล้ว</div>
          <div className="text-3xl font-bold text-[#d29922] mt-1">{answeredCount}</div>
          <div className="text-[11px] text-[#8b949e] mt-1 font-mono">
            ส่งคำตอบแล้ว รอนักเรียนปิดคำถาม
          </div>
        </div>

        {/* 🟢 CLOSED */}
        <div
          onClick={() => setStatusFilter("CLOSED")}
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            statusFilter === "CLOSED"
              ? "border-[#3fb950] bg-[#238636]/15 shadow-sm"
              : "border-[#30363d] bg-[#161b22] hover:border-[#8b949e]"
          }`}
        >
          <div className="text-[11px] font-mono text-[#8b949e]">🟢 ปิดแล้ว</div>
          <div className="text-3xl font-bold text-[#3fb950] mt-1">{closedCount}</div>
          <div className="text-[11px] text-[#8b949e] mt-1 font-mono">
            นักเรียนเข้าใจและปิดคำถามแล้ว
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              statusFilter === "ALL"
                ? "bg-[#21262d] text-[#f0f6fc] font-semibold border border-[#30363d]"
                : "text-[#8b949e] hover:text-[#f0f6fc]"
            }`}
          >
            ทั้งหมด ({initialInquiries.length})
          </button>
          <button
            onClick={() => setStatusFilter("OPEN")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              statusFilter === "OPEN"
                ? "bg-[#da3633]/20 text-[#f85149] font-semibold border border-[#da3633]/40"
                : "text-[#8b949e] hover:text-[#f0f6fc]"
            }`}
          >
            🔴 ยังไม่ตอบ ({openCount})
          </button>
          <button
            onClick={() => setStatusFilter("ANSWERED")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              statusFilter === "ANSWERED"
                ? "bg-[#d29922]/20 text-[#d29922] font-semibold border border-[#d29922]/40"
                : "text-[#8b949e] hover:text-[#f0f6fc]"
            }`}
          >
            🟡 ตอบแล้ว ({answeredCount})
          </button>
          <button
            onClick={() => setStatusFilter("CLOSED")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
              statusFilter === "CLOSED"
                ? "bg-[#238636]/20 text-[#3fb950] font-semibold border border-[#238636]/40"
                : "text-[#8b949e] hover:text-[#f0f6fc]"
            }`}
          >
            🟢 ปิดแล้ว ({closedCount})
          </button>
        </div>

        {/* Class Filter & Search */}
        <div className="flex items-center gap-2">
          {classes.length > 1 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] rounded-md px-2.5 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="ALL">ทุกห้องเรียน</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือคำถาม..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#f0f6fc] placeholder-[#5a5e72] focus:outline-none focus:border-[#58a6ff] w-48 sm:w-56"
          />
        </div>
      </div>

      {/* ─── Inquiries List ─── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-12 text-center space-y-2">
          <div className="text-3xl">📭</div>
          <div className="text-sm font-semibold text-[#f0f6fc]">
            ไม่มีข้อความตรงกับเงื่อนไข
          </div>
          <p className="text-xs text-[#8b949e]">
            เมื่อนักเรียนในห้องเรียนของคุณส่งคำถามหรือแจ้งปัญหา จะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const cat = CATEGORY_MAP[item.category] || { label: item.category, icon: "💬" };
            const isReplyingThis = activeReplyId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-[#161b22] p-5 space-y-3.5 transition-all shadow-sm ${
                  item.status === "OPEN"
                    ? "border-[#f85149]/40 hover:border-[#f85149]"
                    : "border-[#30363d] hover:border-[#58a6ff]/40"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1f6feb]/20 border border-[#1f6feb]/30 flex items-center justify-center text-xs font-bold text-[#58a6ff]">
                      {item.studentName.charAt(0) || "S"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#f0f6fc]">
                          {item.studentName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e]">
                          {item.classId}
                        </span>
                        <span className="text-xs">{cat.icon}</span>
                        <span className="text-xs text-[#8b949e]">
                          {cat.label}
                        </span>
                      </div>
                      {item.studentEmail && (
                        <div className="text-[11px] font-mono text-[#5a5e72]">
                          {item.studentEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "OPEN" && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#da3633]/15 text-[#f85149] border border-[#da3633]/30 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f85149] animate-pulse" />
                        ยังไม่ได้ตอบ
                      </span>
                    )}
                    {item.status === "ANSWERED" && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/30 font-semibold">
                        ตอบแล้ว
                      </span>
                    )}
                    {item.status === "CLOSED" && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30">
                        ปิดแล้ว
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-[#8b949e]">
                      {item.createdAt}
                    </span>
                  </div>
                </div>

                {/* Question-level Context Banner (As requested by user!) */}
                {item.context && (
                  <div className="rounded-lg border border-[#1f6feb]/30 bg-[#1f6feb]/10 p-3 text-xs space-y-1">
                    <div className="font-semibold text-[#58a6ff] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>💡</span>
                        <span>
                          บริบทข้อสอบ: {item.context.assignmentTitle || "แบบฝึกหัด"}
                          {item.context.questionIndex !== undefined &&
                            ` (ข้อที่ ${item.context.questionIndex})`}
                        </span>
                      </div>
                      {item.context.assignmentId && (
                        <Link
                          href={`/dashboard/${item.context.assignmentId}`}
                          className="text-[11px] text-[#79c0ff] hover:underline"
                        >
                          เปิดโจทย์ข้อนี้ →
                        </Link>
                      )}
                    </div>
                    {item.context.questionPrompt && (
                      <div className="text-[11px] text-[#c9d1d9] pl-3 border-l-2 border-[#58a6ff]/40">
                        โจทย์: &quot;{item.context.questionPrompt}&quot;
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#f0f6fc]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#c9d1d9] leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-[#30363d]">
                    &quot;{item.content}&quot;
                  </p>
                </div>

                {/* Teacher's Current Answer (if already answered) */}
                {item.reply && !isReplyingThis && (
                  <div className="rounded-lg border border-[#238636]/30 bg-[#238636]/8 p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#3fb950] font-semibold">
                      <span>คำตอบของคุณ ({item.answeredBy}):</span>
                      {item.answeredAt && (
                        <span className="text-[10px] font-mono text-[#8b949e]">
                          {item.answeredAt}
                        </span>
                      )}
                    </div>
                    <div className="text-[#f0f6fc] whitespace-pre-wrap">
                      {item.reply}
                    </div>
                  </div>
                )}

                {/* Action / Reply Toggle */}
                {!isReplyingThis ? (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenReply(item)}
                      className="px-3.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs font-mono text-[#58a6ff] hover:text-white border border-[#30363d] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>💬</span>
                      <span>{item.reply ? "แก้ไขคำตอบ" : "ตอบคำถามนักเรียน"}</span>
                    </button>
                  </div>
                ) : (
                  /* Reply Input Box */
                  <div className="rounded-xl border border-[#58a6ff]/40 bg-[#0d1117] p-4 space-y-3 mt-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#f0f6fc]">
                      <span>ตอบคำถามถึง {item.studentName}:</span>
                      <button
                        type="button"
                        onClick={() => setActiveReplyId(null)}
                        className="text-[#8b949e] hover:text-[#f0f6fc]"
                      >
                        ✕ ยกเลิก
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="เขียนคำอธิบาย วิธีคิด หรือคำแนะนำแก่นักเรียน..."
                      className="w-full px-3 py-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#5a5e72] focus:outline-none focus:border-[#58a6ff] transition-colors resize-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
                        <span>ปรับสถานะเป็น:</span>
                        <select
                          value={replyStatus}
                          onChange={(e) => setReplyStatus(e.target.value as "ANSWERED" | "CLOSED")}
                          className="bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-xs text-[#c9d1d9] focus:outline-none"
                        >
                          <option value="ANSWERED">🟡 ตอบแล้ว (ANSWERED)</option>
                          <option value="CLOSED">🟢 ตอบและปิดคำถามเลย (CLOSED)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(null)}
                          className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-xs text-[#c9d1d9] border border-[#30363d] cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendReply(item.id)}
                          disabled={replying}
                          className="px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {replying ? (
                            <>
                              <Spinner className="w-3 h-3 text-white" />
                              <span>กำลังส่ง...</span>
                            </>
                          ) : (
                            <>
                              <span>ส่งคำตอบ</span>
                              <span aria-hidden>→</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
