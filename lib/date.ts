import { DateTime } from "luxon";

// ===================================================================
// BUG-09: Timezone helper สำหรับจัดการเวลาในเขตเวลาไทย (Asia/Bangkok)
// BUG-10: Dynamic default due date
// ===================================================================

const BANGKOK_ZONE = "Asia/Bangkok";

/**
 * จัดรูปแบบวันที่ให้แสดงผลตามเขตเวลาไทย (Asia/Bangkok) อย่างถูกต้อง
 * รองรับทั้ง Firestore Timestamp, JavaScript Date, ISO string
 */
export function formatBangkokDate(
  date: Date | { toDate: () => Date } | { _seconds: number } | string | null | undefined
): string {
  if (!date) return "ไม่ระบุ";

  try {
    let jsDate: Date;
    if (typeof date === "object" && date !== null && "toDate" in date && typeof date.toDate === "function") {
      jsDate = date.toDate();
    } else if (typeof date === "object" && date !== null && "_seconds" in date) {
      jsDate = new Date(date._seconds * 1000);
    } else if (date instanceof Date) {
      jsDate = date;
    } else {
      jsDate = new Date(date as string);
    }

    if (isNaN(jsDate.getTime())) return "ไม่ระบุ";

    const dt = DateTime.fromJSDate(jsDate).setZone(BANGKOK_ZONE);
    return dt.toFormat("dd/MM/yyyy HH:mm 'น.'");
  } catch {
    return "ไม่ระบุ";
  }
}

/**
 * คำนวณค่าเริ่มต้นของ Due Date สำหรับ input type="datetime-local"
 * ล่วงหน้า 7 วัน เวลา 23:59 ในเขตเวลาไทย (Asia/Bangkok)
 */
export function getDefaultDueDateTimeLocal(): string {
  const dt = DateTime.now().setZone(BANGKOK_ZONE).plus({ days: 7 }).set({
    hour: 23,
    minute: 59,
    second: 0,
    millisecond: 0,
  });

  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
}
