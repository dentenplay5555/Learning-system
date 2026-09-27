// ===================================================================
// BUG-08: Server Validation ไม่ครบ — ใช้ Zod ตรวจข้อมูลฝั่ง Server
// BUG-14: true_false รองรับไม่ครบ — รองรับ true_false อย่างถูกต้อง
// ===================================================================

import { z } from "zod";

export const questionSchema = z
  .object({
    id: z.string().trim().min(1, "Question ID ต้องไม่ว่าง"),
    prompt: z.string().trim().min(1, "โจทย์คำถามต้องไม่ว่าง"),
    type: z.enum(["multiple_choice", "true_false"]),
    options: z
      .array(z.string().trim().min(1, "ตัวเลือกต้องไม่ว่าง"))
      .min(2, "ต้องมีตัวเลือกอย่างน้อย 2 ข้อ"),
    points: z
      .number()
      .finite()
      .positive(),
    correctAnswer: z.union([z.string().min(1), z.number()]),
  })
  .refine(
    (q) => {
      // ตรวจสอบว่าเฉลย (correctAnswer) สอดคล้องกับ options
      if (typeof q.correctAnswer === "number") {
        return (
          Number.isInteger(q.correctAnswer) &&
          q.correctAnswer >= 0 &&
          q.correctAnswer < q.options.length
        );
      }
      return q.options.includes(q.correctAnswer);
    },
    {
      message: "เฉลย (correctAnswer) ต้องเป็นตัวเลือกที่มีอยู่จริง",
      path: ["correctAnswer"],
    }
  )
  .refine(
    (q) => {
      // หากเป็นข้อสอบประเภท true_false ต้องมีตัวเลือก 2 ข้อ
      if (q.type === "true_false") {
        return q.options.length === 2;
      }
      return true;
    },
    {
      message: "ข้อสอบประเภท ถูก/ผิด (true_false) ต้องมี 2 ตัวเลือกเท่านั้น",
      path: ["options"],
    }
  );

export const createAssignmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "ชื่อแบบฝึกหัดต้องไม่ว่าง")
    .max(200, "ชื่อแบบฝึกหัดยาวเกิน 200 ตัวอักษร"),
  description: z.string().max(2000, "คำอธิบายยาวเกิน 2000 ตัวอักษร").default(""),
  classId: z.string().trim().min(1, "ต้องระบุห้องเรียน"),
  dueAt: z.string().trim().min(1, "ต้องระบุวันและเวลากำหนดส่ง"),
  questions: z
    .array(questionSchema)
    .min(1, "ต้องมีคำถามอย่างน้อย 1 ข้อ")
    .refine(
      (items) => {
        // BUG-08 Checklist: Question ID ห้ามซ้ำ
        const ids = items.map((q) => q.id);
        return new Set(ids).size === ids.length;
      },
      {
        message: "Question ID ในแบบฝึกหัดต้องไม่ซ้ำกัน",
      }
    ),
});

export const submitAnswersSchema = z.record(
  z.string().min(1),
  z.union([z.string(), z.number()])
);

export type QuestionSchemaType = z.infer<typeof questionSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
