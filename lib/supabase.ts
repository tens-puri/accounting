
import { createClient } from '@supabase/supabase-js';

// ใน Vercel ให้ตั้งค่า Environment Variables เหล่านี้ในหน้า Project Settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fpwhdrkxyingupoisjso.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_73DQMvJIAX8imsgj1zKx4Q_F_qVy5K1';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
