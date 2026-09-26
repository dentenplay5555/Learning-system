"use client";

import { useState } from "react";
import Link from "next/link";
import { submitAssignmentAction } from "@/lib/actions";
import Spinner from "@/components/Spinner";

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
  maxScore: number;
  questions: Question[];
}

export default function QuizRunnerClient({
  assignment,
  studentName,
}: {
  assignment: Assignment;
  studentName: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    submissionId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questions = assignment.questions || [];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (answeredCount < questions.length) {
      if (!confirm("คุณยังตอบคำถามไม่ครบทุกข้อ ต้องการยืนยันการส่งคำตอบหรือไม่?")) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // เรียก Server Action เพื่อให้ Server ทำการตรวจเทียบคำตอบกับ /answerKeys ป้องกันการแอบดูเฉลย
      const res = await submitAssignmentAction(assignment.id, answers);

      if (!res.success) {
        throw new Error(res.error || "เกิดข้อผิดพลาดในการส่งงาน");
      }

      setResult({
        score: res.score ?? 0,
        maxScore: res.maxScore ?? assignment.maxScore,
        submissionId: res.submissionId || "",
      });
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "ไม่สามารถส่งงานได้";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // แสดงผลลัพธ์คะแนนเมื่อส่งงานสำเร็จ
  if (result) {
    const percentage = Math.round((result.score / result.maxScore) * 100);

    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/10">
          🎉
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            ตรวจคะแนนเรียบร้อยโดยเซิร์ฟเวอร์ (Graded)
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white pt-2">
            บันทึกการส่งงานสำเร็จ!
          </h2>
          <p className="text-xs text-slate-400">{assignment.title}</p>
        </div>

        {/* Score Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400">
            {result.score} / {result.maxScore}
          </div>
          <div className="text-xs font-medium text-slate-400">
            คิดเป็น {percentage}% ของคะแนนเต็ม
          </div>
        </div>

        <div className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          คำตอบของคุณได้รับการบันทึกและส่งต่อไปยังคุณครูผู้สอนประจำวิชาเรียบร้อยแล้ว
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            ← กลับไปที่ Dashboard นักเรียน
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Exercise Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {assignment.classId}
          </span>
          <span className="text-xs text-slate-400">
            ผู้ทำ: <strong className="text-slate-200">{studentName}</strong>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {assignment.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {assignment.description}
        </p>

        {/* Progress Bar */}
        <div className="pt-2 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              ตอบแล้ว {answeredCount} จาก {questions.length} ข้อ
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, index) => {
          const selectedOption = answers[q.id];

          return (
            <div
              key={q.id}
              className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4 relative"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                  ข้อที่ {index + 1}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {q.points || 1} คะแนน
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                {q.prompt}
              </h3>

              {/* Options */}
              <div className="space-y-2.5 pt-2">
                {q.options.map((opt, optIndex) => {
                  const isSelected = selectedOption === optIndex;

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600/20 border-2 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                          : "bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-600 text-white"
                            : "border-slate-600 text-slate-400"
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

      {/* Submit Action Bar */}
      <div className="sticky bottom-6 z-20 glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl flex items-center justify-between gap-4 border border-indigo-500/30 bg-slate-950/90 backdrop-blur-lg">
        <div className="text-xs text-slate-400 hidden sm:block">
          ระบบจะตรวจคำตอบและคิดคะแนนให้ทันทีที่กดส่ง
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting && <Spinner className="w-4 h-4" />}
            {submitting ? "กำลังส่งและประมวลผลคะแนน..." : "ยืนยันส่งคำตอบ 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
