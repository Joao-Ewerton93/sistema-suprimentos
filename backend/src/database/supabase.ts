import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://sua-url-aqui.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sua-chave-aqui';

// Usamos a SERVICE_ROLE_KEY no backend para ignorar RLS e realizar operações de admin.
export const supabase = createClient(supabaseUrl, supabaseKey);
