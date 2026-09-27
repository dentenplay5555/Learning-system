import { z } from "zod";

export const INQUIRY_CATEGORIES = [
  { id: "content", label: "❓ สงสัยเนื้อหา", desc: "ไม่เข้าใจทฤษฎี สูตร หรือบทเรียน" },
  { id: "assignment", label: "📝 สงสัยเกี่ยวกับงาน", desc: "โจทย์ไม่ชัดเจน หรือติดปัญหาในข้อสอบ" },
  { id: "score", label: "📊 สอบถามคะแนน", desc: "คะแนนไม่ตรง หรือต้องการคำชี้แจง" },
  { id: "system", label: "🛠️ แจ้งปัญหาระบบ", desc: "หน้าเว็บค้าง ส่งงานไม่ได้ หรือมีบั๊ก" },
  { id: "other", label: "💬 อื่น ๆ", desc: "เรื่องทั่วไปที่ต้องการปรึกษาครู" },
] as const;

export const createInquirySchema = z.object({
  classId: z.string().trim().min(1, "กรุณาระบุห้องเรียน"),
  category: z.enum(["content", "assignment", "score", "system", "other"], {
    errorMap: () => ({ message: "กรุณาเลือกประเภทเรื่องที่ต้องการติดต่อ" }),
  }),
  title: z
    .string()
    .trim()
    .min(3, "หัวข้อต้องมีความยาวอย่างน้อย 3 ตัวอักษร")
    .max(150, "หัวข้อยาวเกิน 150 ตัวอักษร"),
  content: z
    .string()
    .trim()
    .min(5, "รายละเอียดต้องมีความยาวอย่างน้อย 5 ตัวอักษร")
    .max(2000, "รายละเอียดยาวเกิน 2000 ตัวอักษร"),
  context: z
    .object({
      assignmentId: z.string().optional(),
      assignmentTitle: z.string().optional(),
      questionIndex: z.number().optional(),
      questionPrompt: z.string().optional(),
    })
    .optional(),
});

export const replyInquirySchema = z.object({
  inquiryId: z.string().trim().min(1, "Inquiry ID ไม่ถูกต้อง"),
  reply: z
    .string()
    .trim()
    .min(1, "คำตอบต้องไม่ว่าง")
    .max(2000, "คำตอบยาวเกิน 2000 ตัวอักษร"),
  newStatus: z.enum(["OPEN", "ANSWERED", "CLOSED"]).default("ANSWERED"),
});

export const closeInquirySchema = z.object({
  inquiryId: z.string().trim().min(1, "Inquiry ID ไม่ถูกต้อง"),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type ReplyInquiryInput = z.infer<typeof replyInquirySchema>;
