"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAssignmentAction } from "@/lib/actions";
import { getDefaultDueDateTimeLocal } from "@/lib/date";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toast";

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
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("class-m4-1");
  const [assignmentType, setAssignmentType] = useState<"practice" | "quiz" | "exam">("practice");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
  const [allowRetake, setAllowRetake] = useState(true);

  // BUG-10: Due Date Dynamic — กำหนดค่าเริ่มต้นเป็น 7 วันข้างหน้าเวลา 23:59 ในเขตเวลาไทย
  const [dueAt, setDueAt] = useState(() => getDefaultDueDateTimeLocal());

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

  const handleSelectType = (type: "practice" | "quiz" | "exam") => {
    setAssignmentType(type);
    if (type === "practice") {
      setAllowRetake(true);
      setTimeLimitMinutes(0);
    } else if (type === "quiz") {
      setAllowRetake(false);
      setTimeLimitMinutes(30);
    } else if (type === "exam") {
      setAllowRetake(false);
      setTimeLimitMinutes(60);
    }
  };

  const handleAddQuestion = () => {
    const nextIndex = questions.length + 1;
    const uniqueId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setQuestions((prev) => [
      ...prev,
      {
        id: uniqueId,
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

  const handleTypeChange = (index: number, newType: "multiple_choice" | "true_false") => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (newType === "true_false") {
        copy[index] = {
          ...copy[index],
          type: "true_false",
          options: ["ถูก (True)", "ผิด (False)"],
          correctAnswer: 0,
        };
      } else {
        copy[index] = {
          ...copy[index],
          type: "multiple_choice",
          options: ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
          correctAnswer: 0,
        };
      }
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
      showToast("กรุณากรอกชื่อแบบฝึกหัด", "error");
      return;
    }

    try {
      setLoading(true);

      const res = await createAssignmentAction({
        title,
        description,
        classId,
        type: assignmentType,
        timeLimitMinutes: Number(timeLimitMinutes) || 0,
        allowRetake: assignmentType === "practice" ? true : allowRetake,
        dueAt,
        questions,
      });

      if (!res.success) {
        throw new Error(res.error || "ไม่สามารถสร้างแบบฝึกหัดได้");
      }

      showToast("สร้างงานในระบบเรียบร้อยแล้ว", "success");
      router.push("/teacher");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Header */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href="/teacher"
              className="text-xs font-mono text-[#8b949e] hover:text-[#f0f6fc] flex items-center gap-1 transition-colors"
            >
              ← กลับ Dashboard คุณครู
            </Link>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#1f6feb]/15 text-[#58a6ff] border border-[#1f6feb]/30">
              คะแนนเต็มรวม: {totalPoints} คะแนน
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#f0f6fc] pt-1">
            สร้างแบบฝึกหัด / ข้อสอบใหม่
          </h1>
          <p className="text-xs text-[#8b949e]">
            เฉลยจะถูกแยกเก็บไว้บน Firestore Private Collection อัตโนมัติ ป้องกันนักเรียนแอบเปิดดู
          </p>
        </div>

        {/* ─── 1. Assignment Type Selector (Practice vs Quiz vs Exam) ─── */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-3">
          <label className="text-xs font-bold text-[#f0f6fc] flex items-center gap-2">
            <span>📚</span>
            <span>เลือกประเภทการเรียนรู้</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 🟢 แบบฝึกหัด (Practice) */}
            <div
              onClick={() => handleSelectType("practice")}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                assignmentType === "practice"
                  ? "border-[#3fb950] bg-[#238636]/15 shadow-sm"
                  : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[#3fb950]">🟢 แบบฝึกหัด</span>
                {assignmentType === "practice" && <span className="text-[#3fb950]">✓</span>}
              </div>
              <p className="text-[11px] text-[#8b949e] mt-2 leading-relaxed">
                เน้นฝึกฝนความเข้าใจ ทำซ้ำได้ไม่จำกัด แสดงเฉลยหลังทำ เพื่อการเรียนรู้
              </p>
            </div>

            {/* 🔵 แบบทดสอบ (Quiz) */}
            <div
              onClick={() => handleSelectType("quiz")}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                assignmentType === "quiz"
                  ? "border-[#58a6ff] bg-[#1f6feb]/15 shadow-sm"
                  : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[#58a6ff]">🔵 แบบทดสอบ</span>
                {assignmentType === "quiz" && <span className="text-[#58a6ff]">✓</span>}
              </div>
              <p className="text-[11px] text-[#8b949e] mt-2 leading-relaxed">
                เน้นวัดความเข้าใจบทเรียน มีคะแนนเก็บ มีเวลาจำกัดหรือกำหนดส่ง
              </p>
            </div>

            {/* 🔴 การสอบ (Exam) */}
            <div
              onClick={() => handleSelectType("exam")}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                assignmentType === "exam"
                  ? "border-[#f85149] bg-[#da3633]/15 shadow-sm"
                  : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-[#f85149]">🔴 การสอบ</span>
                {assignmentType === "exam" && <span className="text-[#f85149]">✓</span>}
              </div>
              <p className="text-[11px] text-[#8b949e] mt-2 leading-relaxed">
                ประเมินผลทางการ ส่งได้ 1 ครั้ง จำกัดเวลา ล็อกคำตอบและบันทึกคะแนนจริง
              </p>
            </div>
          </div>
        </div>

        {/* ─── 2. Basic Details Section ─── */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#f0f6fc]">ข้อมูลพื้นฐาน</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#c9d1d9]">ชื่อหัวข้องาน / ข้อสอบ *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น แบบฝึกหัดเรื่องสมการเชิงเส้น หรือ สอบกลางภาคคณิตศาสตร์"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-sm text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] transition-colors"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#c9d1d9]">คำอธิบายและคำชี้แจง</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุคำชี้แจงสำหรับนักเรียน เช่น ข้อสอบมี 10 ข้อ ให้เลือกคำตอบที่ดีที่สุด..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-sm text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#c9d1d9]">ห้องเรียนเป้าหมาย</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="class-m4-1">ห้อง ม.4/1</option>
                <option value="class-m4-2">ห้อง ม.4/2</option>
                <option value="class-m4-3">ห้อง ม.4/3</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#c9d1d9]">วันและเวลาครบกำหนดส่ง</label>
              <input
                type="datetime-local"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            {/* Time limit for quiz/exam */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#c9d1d9]">
                จำกัดเวลาทำ (นาที) — 0 คือไม่จำกัด
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>
        </div>

        {/* ─── 3. Questions Builder ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <span>✍️</span> ข้อสอบและเฉลย ({questions.length} ข้อ)
            </h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="px-3.5 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#58a6ff] text-xs font-mono transition-colors cursor-pointer"
            >
              + เพิ่มข้อสอบ
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#58a6ff] bg-[#1f6feb]/15 px-2 py-0.5 rounded border border-[#1f6feb]/30">
                    ข้อที่ {qIndex + 1}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) => handleTypeChange(qIndex, e.target.value as "multiple_choice" | "true_false")}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#c9d1d9]"
                  >
                    <option value="multiple_choice">ปรนัย (4 ตัวเลือก)</option>
                    <option value="true_false">ถูก/ผิด (True/False)</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                    <span>คะแนน:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.points}
                      onChange={(e) => handleQuestionChange(qIndex, "points", Number(e.target.value))}
                      className="w-16 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-center text-xs text-white"
                    />
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="text-[#f85149] hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-950/20"
                    >
                      ลบข้อนี้
                    </button>
                  )}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8b949e]">โจทย์คำถาม *</label>
                <textarea
                  rows={2}
                  required
                  value={q.prompt}
                  onChange={(e) => handleQuestionChange(qIndex, "prompt", e.target.value)}
                  placeholder="พิมพ์โจทย์คำถามที่นี่..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-white focus:outline-none focus:border-[#58a6ff] resize-none"
                />
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                <label className="text-xs text-[#8b949e] flex items-center justify-between">
                  <span>ตัวเลือก (คลิกวงกลมเพื่อเลือกข้อที่ถูกต้องเป็นเฉลย):</span>
                  <span className="text-[#3fb950] font-mono text-[11px]">
                    เฉลย: ตัวเลือกที่ {String.fromCharCode(65 + Number(q.correctAnswer))}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIndex) => (
                    <div
                      key={optIndex}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        q.correctAnswer === optIndex
                          ? "border-[#3fb950] bg-[#238636]/10"
                          : "border-[#30363d] bg-[#0d1117]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleQuestionChange(qIndex, "correctAnswer", optIndex)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 cursor-pointer ${
                          q.correctAnswer === optIndex
                            ? "border-[#3fb950] bg-[#238636] text-white"
                            : "border-[#30363d] text-[#8b949e] hover:border-[#8b949e]"
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}
                      </button>

                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                        className="w-full bg-transparent border-none text-xs text-[#f0f6fc] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#30363d]">
          <Link
            href="/teacher"
            className="px-4 py-2 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-mono text-[#c9d1d9]"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Spinner className="w-3.5 h-3.5 text-white" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <span>บันทึกและเผยแพร่</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
