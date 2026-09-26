"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAssignmentAction } from "@/lib/actions";

interface QuestionInput {
  id: string;
  type: "multiple_choice" | "true_false";
  prompt: string;
  options: string[];
  points: number;
  correctAnswer: number;
}

export default function NewAssignmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("class-m4-1");
  const [dueAt, setDueAt] = useState("2026-10-15T23:59");

  const [questions, setQuestions] = useState<QuestionInput[]>([
    {
      id: "q1",
      type: "multiple_choice",
      prompt: "จงเลือกคำตอบที่ถูกต้อง",
      options: ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
      points: 10,
      correctAnswer: 0,
    },
  ]);

  const handleAddQuestion = () => {
    const nextIndex = questions.length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        id: `q${Date.now()}`,
        type: "multiple_choice",
        prompt: `คำถามข้อที่ ${nextIndex}`,
        options: ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
        points: 10,
        correctAnswer: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: string | number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOptions = [...copy[qIndex].options];
      newOptions[optIndex] = text;
      copy[qIndex].options = newOptions;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("กรุณากรอกชื่อแบบฝึกหัด");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // เรียก Server Action ซึ่งจะแยก questions กับ answerKeys เก็บคนละ collection
      const res = await createAssignmentAction({
        title,
        description,
        classId,
        dueAt,
        questions,
      });

      if (!res.success) {
        throw new Error(res.error || "ไม่สามารถสร้างแบบฝึกหัดได้");
      }

      router.push("/teacher");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Top Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href="/teacher"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              ← กลับ Dashboard คุณครู
            </Link>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              คะแนนเต็มรวม: {totalPoints} คะแนน
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white pt-2">
            สร้างแบบฝึกหัดใหม่
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            ระบบจะแยกคำตอบที่ถูกต้อง (Answer Key) ไปเก็บในคอลเลกชันความปลอดภัยสูงโดยอัตโนมัติ
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Basic Details Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-bold text-white">ข้อมูลพื้นฐานของแบบฝึกหัด</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">ชื่อแบบฝึกหัด *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น แบบทดสอบฟิสิกส์เรื่องแรงและการเคลื่อนที่"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">คำอธิบายเพิ่มเติม</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุคำชี้แจงสำหรับนักเรียน..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">ห้องเรียนเป้าหมาย</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="class-m4-1">ห้อง ม.4/1</option>
                <option value="class-m4-2">ห้อง ม.4/2</option>
                <option value="class-m4-3">ห้อง ม.4/3</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">วันและเวลาครบกำหนดส่ง (Due Date)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>✍️</span> ข้อสอบและเฉลย ({questions.length} ข้อ)
            </h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              + เพิ่มข้อสอบ
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 relative border-l-4 border-l-cyan-500"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-800/40">
                  ข้อที่ {qIndex + 1}
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span>คะแนน:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.points}
                      onChange={(e) =>
                        handleQuestionChange(qIndex, "points", parseInt(e.target.value) || 1)
                      }
                      className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs text-white"
                    />
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-950/40 transition-colors"
                    >
                      ลบข้อนี้
                    </button>
                  )}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">โจทย์คำถาม</label>
                <input
                  type="text"
                  required
                  value={q.prompt}
                  onChange={(e) => handleQuestionChange(qIndex, "prompt", e.target.value)}
                  placeholder="พิมพ์คำถามที่นี่..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Options & Radio for correct answer */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>ตัวเลือก (คลิกวงกลมเพื่อเลือกเป็นคำตอบที่ถูกต้อง / Answer Key)</span>
                  <span className="text-[10px] text-emerald-400">เฉลยจะถูกซ่อนจากนักเรียน 🔒</span>
                </label>

                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => {
                    const isCorrect = q.correctAnswer === optIndex;

                    return (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          isCorrect
                            ? "bg-emerald-950/30 border-emerald-500/60"
                            : "bg-slate-900/60 border-slate-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct_${q.id}`}
                          checked={isCorrect}
                          onChange={() => handleQuestionChange(qIndex, "correctAnswer", optIndex)}
                          className="w-4 h-4 text-emerald-500 accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-400 w-5">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          placeholder={`ตัวเลือก ${String.fromCharCode(65 + optIndex)}`}
                          className="flex-1 bg-transparent text-xs sm:text-sm text-white focus:outline-none"
                        />
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/40">
                            เฉลยถูกต้อง ✓
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800/80">
          <Link
            href="/teacher"
            className="px-5 py-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-cyan-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {loading ? "กำลังบันทึกและแยกเฉลย..." : "บันทึกและเผยแพร่แบบฝึกหัด 🚀"}
          </button>
        </div>
      </form>
    </div>
  );
}
