// ===================================================================================
//  CONFIGURAÇÕES E SERVIÇOS EXTERNOS
// ===================================================================================

// IMPORTANTE: Substitua pelas suas credenciais do Supabase.
const SUPABASE_URL = 'https://qtdyakpmgpxweilvszvm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0ZHlha3BtZ3B4d2VpbHZzenZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTI2NTksImV4cCI6MjA3MTQ4ODY1OX0.gZXvuwV62xnfzj88uqRklP2FJV61JRjCgBZcB1Ri4Vw';

// Inicializa o cliente do Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
