"use client";

import { useState } from "react";
import Link from "next/link";
import AnimatedCounter from "@/components/AnimatedCounter";
import AskTeacherModal from "@/components/AskTeacherModal";

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  classId: string;
  type: "practice" | "quiz" | "exam";
  timeLimitMinutes?: number;
  allowRetake?: boolean;
  questionCount: number;
  maxScore: number;
  dueAt: string;
  status: string;
  score?: number;
}

export default function StudentDashboardClient({
  assignments,
  studentName,
  studentClasses,
}: {
  assignments: AssignmentItem[];
  studentName: string;
  studentClasses: string[];
}) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | "practice" | "quiz" | "exam">("ALL");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const pendingCount = assignments.filter((a) => a.status !== "graded").length;
  const gradedList = assignments.filter((a) => a.status === "graded" && typeof a.score === "number");
  const gradedCount = gradedList.length;
  const avgPercent =
    gradedCount > 0
      ? Math.round(
          (gradedList.reduce((acc, a) => acc + (a.score! / (a.maxScore || 1)) * 100, 0) / gradedCount)
        )
      : 0;

  const practiceCount = assignments.filter((a) => a.type === "practice").length;
  const quizCount = assignments.filter((a) => a.type === "quiz").length;
  const examCount = assignments.filter((a) => a.type === "exam").length;

  const filtered = assignments.filter((item) => {
    if (typeFilter === "ALL") return true;
    return item.type === typeFilter;
  });

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div className="space-y-1">
          <div className="text-[12px] font-mono text-[#8b949e] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1f6feb]" />
            <span>student / {studentClasses.join(", ")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f0f6fc]">
            ยินดีต้อนรับ, {studentName}
          </h1>
          <p className="text-[13px] text-[#8b949e]">
            ตรวจสอบแบบฝึกหัด แบบทดสอบ และการสอบในห้องเรียนของคุณ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-1.5 text-center min-w-[68px]">
              <AnimatedCounter target={pendingCount} className="text-base font-bold text-[#d29922]" />
              <div className="text-[10px] text-[#8b949e] font-mono">รอส่ง</div>
            </div>
            <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-1.5 text-center min-w-[68px]">
              <AnimatedCounter target={gradedCount} className="text-base font-bold text-[#3fb950]" />
              <div className="text-[10px] text-[#8b949e] font-mono">ตรวจแล้ว</div>
            </div>
            <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-1.5 text-center min-w-[68px]">
              <AnimatedCounter target={avgPercent} suffix="%" className="text-base font-bold text-[#58a6ff]" />
              <div className="text-[10px] text-[#8b949e] font-mono">เฉลี่ย</div>
            </div>
          </div>

          {/* Contact Teacher Button */}
          <button
            type="button"
            onClick={() => setIsContactModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-mono text-[#58a6ff] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>💬</span>
            <span>ติดต่อครู</span>
          </button>
        </div>
      </div>

      {/* ─── Type Filter Tabs (Requested by user!) ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#30363d] pb-3 text-xs font-mono">
        <button
          onClick={() => setTypeFilter("ALL")}
          className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
            typeFilter === "ALL"
              ? "bg-[#21262d] text-[#f0f6fc] font-semibold border border-[#30363d] shadow-sm"
              : "text-[#8b949e] hover:text-[#f0f6fc]"
          }`}
        >
          ทั้งหมด ({assignments.length})
        </button>

        {/* 🟢 แบบฝึกหัด (Practice) */}
        <button
          onClick={() => setTypeFilter("practice")}
          className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === "practice"
              ? "bg-[#238636]/20 text-[#3fb950] font-semibold border border-[#238636]/50 shadow-sm"
              : "text-[#8b949e] hover:text-[#3fb950]"
          }`}
        >
          <span>🟢 แบบฝึกหัด</span>
          <span className="text-[10px] opacity-75">({practiceCount})</span>
        </button>

        {/* 🔵 แบบทดสอบ (Quiz) */}
        <button
          onClick={() => setTypeFilter("quiz")}
          className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === "quiz"
              ? "bg-[#1f6feb]/20 text-[#58a6ff] font-semibold border border-[#1f6feb]/50 shadow-sm"
              : "text-[#8b949e] hover:text-[#58a6ff]"
          }`}
        >
          <span>🔵 แบบทดสอบ</span>
          <span className="text-[10px] opacity-75">({quizCount})</span>
        </button>

        {/* 🔴 การสอบ (Exam) */}
        <button
          onClick={() => setTypeFilter("exam")}
          className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
            typeFilter === "exam"
              ? "bg-[#da3633]/20 text-[#f85149] font-semibold border border-[#da3633]/50 shadow-sm"
              : "text-[#8b949e] hover:text-[#f85149]"
          }`}
        >
          <span>🔴 การสอบ</span>
          <span className="text-[10px] opacity-75">({examCount})</span>
        </button>
      </div>

      {/* ─── Assignment Cards Grid ─── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-12 text-center space-y-2">
          <div className="text-3xl">📚</div>
          <p className="text-sm text-[#f0f6fc] font-semibold">
            ไม่มีรายการในหมวดนี้
          </p>
          <p className="text-xs text-[#8b949e]">
            เมื่อคุณครูเพิ่มแบบฝึกหัด แบบทดสอบ หรือการสอบ จะแสดงที่นี่
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isPractice = item.type === "practice";
            const isQuiz = item.type === "quiz";
            const isExam = item.type === "exam";

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-[#161b22] p-5 flex flex-col justify-between transition-all shadow-sm ${
                  isExam
                    ? "border-[#da3633]/30 hover:border-[#f85149]/60"
                    : isQuiz
                    ? "border-[#1f6feb]/30 hover:border-[#58a6ff]/60"
                    : "border-[#30363d] hover:border-[#3fb950]/50"
                }`}
              >
                <div className="space-y-3">
                  {/* Category Pill + Status */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Type Badge */}
                    {isPractice && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 font-medium flex items-center gap-1">
                        <span>🟢</span>
                        <span>แบบฝึกหัด</span>
                      </span>
                    )}
                    {isQuiz && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#1f6feb]/15 text-[#58a6ff] border border-[#1f6feb]/30 font-medium flex items-center gap-1">
                        <span>🔵</span>
                        <span>แบบทดสอบ</span>
                      </span>
                    )}
                    {isExam && (
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#da3633]/15 text-[#f85149] border border-[#da3633]/30 font-medium flex items-center gap-1">
                        <span>🔴</span>
                        <span>การสอบ</span>
                      </span>
                    )}

                    {/* Result or Pending status */}
                    {item.status === "graded" ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 font-semibold">
                        {item.score}/{item.maxScore} คะแนน
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/30">
                        ยังไม่ส่ง
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-[15px] text-[#f0f6fc] leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-[12px] text-[#8b949e] line-clamp-2 leading-relaxed mt-1">
                      {item.description || (
                        isPractice
                          ? "เน้นฝึกฝน • ทำซ้ำได้ไม่จำกัด • ดูเฉลยหลังส่ง"
                          : isQuiz
                          ? "วัดความเข้าใจ • มีคะแนนเก็บในระบบ"
                          : "การสอบประเมินผลทางการ • ส่งได้ 1 ครั้ง"
                      )}
                    </p>
                  </div>

                  {/* Sub-meta (Questions / Time limit) */}
                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#8b949e] pt-1">
                    <span>📝 {item.questionCount} ข้อ</span>
                    {item.timeLimitMinutes && item.timeLimitMinutes > 0 ? (
                      <span>⏱️ {item.timeLimitMinutes} นาที</span>
                    ) : (
                      <span>⏱️ ไม่จำกัดเวลา</span>
                    )}
                    <span>🏷️ {item.classId}</span>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="pt-4 mt-4 border-t border-[#21262d] flex items-center justify-between">
                  <div className="text-[11px] font-mono text-[#8b949e]">
                    กำหนด: <span className="text-[#c9d1d9]">{item.dueAt}</span>
                  </div>
                  <Link
                    href={`/dashboard/${item.id}`}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all shadow-sm cursor-pointer ${
                      item.status === "graded" && !isPractice
                        ? "bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d]"
                        : isExam
                        ? "bg-[#da3633] hover:bg-[#b62324] text-white border border-[rgba(240,246,252,0.1)]"
                        : "bg-[#238636] hover:bg-[#2ea043] text-white border border-[rgba(240,246,252,0.1)]"
                    }`}
                  >
                    {item.status === "graded"
                      ? isPractice
                        ? "ฝึกซ้ำอีกครั้ง ↺"
                        : "ดูผลคะแนน"
                      : isExam
                      ? "เข้าห้องสอบ →"
                      : isQuiz
                      ? "เริ่มทำทดสอบ →"
                      : "เริ่มฝึกฝน →"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Teacher Modal */}
      <AskTeacherModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        defaultClassId={studentClasses[0] || "class-m4-1"}
      />
    </div>
  );
}
