
import { createClient } from '@supabase/supabase-js';

// ป้องกันแอปพังถ้า process.env ไม่มีอยู่จริงใน Browser context
const getEnv = (key: string, defaultValue: string) => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[key]) || defaultValue;
  } catch {
    return defaultValue;
  }
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fpwhdrkxyingupoisjso.supabase.co');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_73DQMvJIAX8imsgj1zKx4Q_F_qVy5K1');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
