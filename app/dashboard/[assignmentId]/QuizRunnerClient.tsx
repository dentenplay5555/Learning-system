"use client";

import { useState } from "react";
import Link from "next/link";
import { submitAssignmentAction } from "@/lib/actions";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import AnimatedCheckmark from "@/components/AnimatedCheckmark";
import AnimatedCounter from "@/components/AnimatedCounter";
import AskTeacherModal, { InquiryContext } from "@/components/AskTeacherModal";

interface Question {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  points: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  classId: string;
  type?: "practice" | "quiz" | "exam";
  timeLimitMinutes?: number;
  allowRetake?: boolean;
  maxScore: number;
  questions: Question[];
}

export default function QuizRunnerClient({
  assignment,
  studentName,
  existingSubmission,
}: {
  assignment: Assignment;
  studentName: string;
  existingSubmission?: {
    score: number;
    maxScore: number;
    submissionId: string;
    answers?: Record<string, string | number>;
  } | null;
}) {
  const { showToast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => {
    return existingSubmission?.answers || {};
  });
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    submissionId: string;
    solutions?: Record<string, string | number>;
  } | null>(existingSubmission ? {
    score: existingSubmission.score,
    maxScore: existingSubmission.maxScore,
    submissionId: existingSubmission.submissionId,
  } : null);

  // Context Modal state
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<InquiryContext | null>(null);

  const assignmentType = assignment.type || "practice";
  const isPractice = assignmentType === "practice" || !!assignment.allowRetake;
  const isQuiz = assignmentType === "quiz";
  const isExam = assignmentType === "exam";

  const questions = assignment.questions || [];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleAskQuestion = (index: number, q: Question) => {
    setSelectedContext({
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      questionIndex: index + 1,
      questionPrompt: q.prompt,
    });
    setInquiryModalOpen(true);
  };

  const handleSubmit = async () => {
    if (answeredCount < questions.length) {
      if (!confirm(`คุณยังตอบไม่ครบ (ตอบแล้ว ${answeredCount}/${questions.length} ข้อ) ยืนยันการส่งคำตอบหรือไม่?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await submitAssignmentAction(assignment.id, answers);

      if (!res.success) {
        throw new Error(res.error || "เกิดข้อผิดพลาดในการส่งงาน");
      }

      showToast("ส่งคำตอบและตรวจคะแนนสำเร็จ", "success");
      setResult({
        score: res.score ?? 0,
        maxScore: res.maxScore ?? assignment.maxScore,
        submissionId: res.submissionId || "",
        solutions: res.solutions,
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "ไม่สามารถส่งงานได้";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryPractice = () => {
    setResult(null);
    setAnswers({});
    showToast("เริ่มทำแบบฝึกหัดใหม่อีกครั้งแล้ว", "info");
  };

  // ─── Result Screen ───
  if (result) {
    const percentage = Math.round((result.score / result.maxScore) * 100);

    return (
      <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-2xl transition-all">
        {/* Animated Checkmark */}
        <div className="flex justify-center pt-2">
          <AnimatedCheckmark size={64} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 text-xs font-mono font-medium">
            <span>ตรวจคะแนนเรียบร้อยโดยเซิร์ฟเวอร์</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[#f0f6fc] pt-1">
            {isPractice ? "ฝึกฝนเสร็จสิ้น!" : "ส่งคำตอบเรียบร้อยแล้ว!"}
          </h2>
          <p className="text-xs text-[#8b949e]">{assignment.title}</p>
        </div>

        {/* Score Card */}
        <div className="p-6 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-2">
          <div className="text-4xl sm:text-5xl font-extrabold text-[#f0f6fc]">
            <AnimatedCounter target={result.score} duration={1000} />
            <span className="text-[#8b949e] font-normal text-2xl"> / {result.maxScore}</span>
          </div>
          <div className="text-xs font-mono text-[#8b949e]">
            คะแนนเฉลี่ย <AnimatedCounter target={percentage} duration={1000} suffix="%" /> ของคะแนนเต็ม
          </div>
        </div>

        {/* Practice Mode Review / Retry Actions */}
        {isPractice && (
          <div className="p-4 rounded-xl border border-[#238636]/30 bg-[#238636]/10 text-xs text-[#c9d1d9] space-y-2">
            <div className="font-semibold text-[#3fb950] flex items-center justify-center gap-1.5">
              <span>💡</span>
              <span>แบบฝึกหัดสามารถทำซ้ำได้ไม่จำกัด</span>
            </div>
            <p className="text-[11px] text-[#8b949e]">
              คุณสามารถลองฝึกฝนข้อที่ไม่มั่นใจใหม่อีกรอบเพื่อพัฒนาความเข้าใจ
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {isPractice && (
            <button
              type="button"
              onClick={handleRetryPractice}
              className="px-5 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-medium border border-[rgba(240,246,252,0.1)] shadow-sm transition-all cursor-pointer"
            >
              🔄 ฝึกซ้ำอีกครั้ง (Re-take)
            </button>
          )}

          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] text-xs font-medium border border-[#30363d] transition-colors"
          >
            ← กลับไปที่หน้านักเรียน
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Exercise Header Bar ─── */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Assignment Type Badge */}
          <div className="flex items-center gap-2">
            {isPractice && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 font-semibold flex items-center gap-1.5">
                <span>🟢</span>
                <span>แบบฝึกหัด (ทำซ้ำได้ • ดูเฉลย)</span>
              </span>
            )}
            {isQuiz && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#1f6feb]/15 text-[#58a6ff] border border-[#1f6feb]/30 font-semibold flex items-center gap-1.5">
                <span>🔵</span>
                <span>แบบทดสอบ (มีคะแนนเก็บ)</span>
              </span>
            )}
            {isExam && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#da3633]/15 text-[#f85149] border border-[#da3633]/30 font-semibold flex items-center gap-1.5">
                <span>🔴</span>
                <span>การสอบทางการ (ส่งได้ 1 ครั้ง)</span>
              </span>
            )}

            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {assignment.classId}
            </span>
          </div>

          <div className="text-xs text-[#8b949e]">
            ผู้ทำ: <strong className="text-[#f0f6fc]">{studentName}</strong>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#f0f6fc] tracking-tight">
            {assignment.title}
          </h1>
          {assignment.description && (
            <p className="text-xs sm:text-sm text-[#8b949e] leading-relaxed mt-1">
              {assignment.description}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="pt-2 space-y-2 border-t border-[#21262d]">
          <div className="flex justify-between text-xs font-mono text-[#8b949e]">
            <span>
              ตอบแล้ว {answeredCount} จาก {questions.length} ข้อ
            </span>
            <span className="text-[#58a6ff] font-semibold">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#21262d] overflow-hidden">
            <div
              className="h-full bg-[#3fb950] progress-bar-smooth rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Questions List ─── */}
      <div className="space-y-5">
        {questions.map((q, index) => {
          const selectedOption = answers[q.id];

          return (
            <div
              key={q.id}
              className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 sm:p-6 space-y-4 relative shadow-sm"
            >
              {/* Question Header with "Ask Teacher" Button */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-mono font-bold text-[#58a6ff] bg-[#1f6feb]/15 px-2.5 py-1 rounded-md border border-[#1f6feb]/30">
                  ข้อที่ {index + 1}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#8b949e]">
                    {q.points || 1} คะแนน
                  </span>

                  {/* 💬 ถามครูเกี่ยวกับข้อนี้ (User requested feature!) */}
                  <button
                    type="button"
                    onClick={() => handleAskQuestion(index, q)}
                    className="text-[11px] font-mono text-[#8b949e] hover:text-[#58a6ff] bg-[#21262d] hover:bg-[#30363d] px-2.5 py-1 rounded-md border border-[#30363d] flex items-center gap-1 transition-colors cursor-pointer"
                    title="สงสัยหรือไม่เข้าใจข้อนี้? ถามคุณครูได้ทันที"
                  >
                    <span>💬</span>
                    <span>ถามครูข้อนี้</span>
                  </button>
                </div>
              </div>

              {/* Question Prompt */}
              <h3 className="text-sm sm:text-base font-semibold text-[#f0f6fc] leading-relaxed">
                {q.prompt}
              </h3>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {q.options.map((opt, optIndex) => {
                  const isSelected = selectedOption === optIndex;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      className={`w-full text-left p-3.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-[#1f6feb]/15 border border-[#58a6ff] text-[#f0f6fc] shadow-sm"
                          : "bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 font-mono transition-colors ${
                          isSelected
                            ? "border-[#58a6ff] bg-[#1f6feb] text-white"
                            : "border-[#30363d] text-[#8b949e]"
                        }`}
                      >
                        {isSelected ? "✓" : String.fromCharCode(65 + optIndex)}
                      </div>
                      <span className="leading-normal">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Submit Action Bar ─── */}
      <div className="sticky bottom-4 z-20 rounded-xl border border-[#30363d] bg-[#161b22]/95 backdrop-blur-md p-4 shadow-2xl flex items-center justify-between gap-4">
        <div className="text-xs text-[#8b949e] hidden sm:block font-mono">
          {isPractice
            ? "แบบฝึกหัด: ตรวจคำตอบทันที และสามารถฝึกซ้ำได้"
            : isExam
            ? "การสอบ: ยืนยันส่งคำตอบแล้วจะไม่สามารถแก้ไขได้อีก"
            : "แบบทดสอบ: ระบบจะบันทึกคะแนนเก็บของคุณ"}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-md text-xs font-mono text-[#8b949e] hover:text-[#f0f6fc] border border-[#30363d] hover:bg-[#21262d] transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex-1 sm:flex-initial px-5 py-2 rounded-md text-white text-xs font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 ${
              isExam
                ? "bg-[#da3633] hover:bg-[#b62324] border border-[rgba(240,246,252,0.1)]"
                : "bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)]"
            }`}
          >
            {submitting && <Spinner className="w-3.5 h-3.5 text-white" />}
            {submitting ? "กำลังตรวจคำตอบ..." : "ยืนยันส่งคำตอบ →"}
          </button>
        </div>
      </div>

      {/* Context Ask Teacher Modal */}
      <AskTeacherModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        defaultClassId={assignment.classId}
        context={selectedContext}
      />
    </div>
  );
}
