// ===================================================================
// BUG-04: Authentication Fail-open — ป้องกัน config หาย แล้วปล่อยผ่าน
// BUG-16: Firebase Dummy Config — ห้ามใช้ fallback dummy config
// ===================================================================

/**
 * อ่าน environment variable ที่ต้องมี — throw ถ้าไม่มี
 * ป้องกัน fail-open เมื่อ config หาย
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
