import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rscyxoumvoyutslvwtqo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3l4b3Vtdm95dXRzbHZ3dHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzYxODUsImV4cCI6MjA5Nzc1MjE4NX0.nOj-ntCl67aCJsa1viTK1XS6NRHRR2izMa2UcQObRBs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
