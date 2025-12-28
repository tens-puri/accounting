
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fpwhdrkxyingupoisjso.supabase.co';
const supabaseAnonKey = 'sb_publishable_73DQMvJIAX8imsgj1zKx4Q_F_qVy5K1';

// Note: Using the key provided by the user. 
// In a real production app, these should come from process.env.NEXT_PUBLIC_...
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
