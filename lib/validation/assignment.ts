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
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  classId: z.string().trim().min(1),

  type: z.enum(["practice", "quiz", "exam"]),

  timeLimitMinutes: z.number().int().min(0),
  allowRetake: z.boolean(),

  dueAt: z.string().min(1),

  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["multiple_choice", "true_false"]),
      prompt: z.string().trim().min(1),
      options: z.array(z.string()),
      points: z.number().positive(),
      correctAnswer: z.union([z.string(), z.number()]),
    })
  ).min(1),
});

export const submitAnswersSchema = z.record(
  z.string().min(1),
  z.union([z.string(), z.number()])
);

export type QuestionSchemaType = z.infer<typeof questionSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type SubmitAnswersInput = z.infer<typeof submitAnswersSchema>;
