
import { createClient } from '@supabase/supabase-js';

// ฟังก์ชันช่วยดึงค่าจาก Environment หรือใช้ค่า Default
export const getEnv = (key: string, defaultValue: string = '') => {
  try {
    // ลองดึงจาก process.env (สำหรับ Vercel/Node)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[key]) return process.env[key];
      // เผื่อกรณีใช้ชื่อ NEXT_PUBLIC_ นำหน้า
      if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
    }
    
    // ลองดึงจาก import.meta (สำหรับ Vite/ESM)
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv[key]) return metaEnv[key];
      if (metaEnv[`VITE_${key}`]) return metaEnv[`VITE_${key}`];
      if (metaEnv[`NEXT_PUBLIC_${key}`]) return metaEnv[`NEXT_PUBLIC_${key}`];
    }
  } catch (e) {
    console.warn(`Error getting env ${key}:`, e);
  }
  return defaultValue;
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://fpwhdrkxyingupoisjso.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'sb_publishable_73DQMvJIAX8imsgj1zKx4Q_F_qVy5K1');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
