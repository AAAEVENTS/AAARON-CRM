// Set values from Supabase > Project Settings > API. Use the PUBLIC publishable/anon key ONLY.
// Never put a Supabase service_role/secret key or an Anthropic/AI key in browser code.
window.AAARON_CONFIG = {
  supabaseUrl: 'https://pcfffihfroltzhebndtf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZmZmaWhmcm9sdHpoZWJuZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTc2NjQsImV4cCI6MjEwODQzMzY2NH0.AXkYYfSgwc7XzysnExA6iW-cQB3Qqg5eTRebYKcRO-s',
  // Optional. URL of your deployed `aaaron-ai` Supabase Edge Function (see AI_GUIDE.md).
  // Leave empty to use the built-in assistants, which work without any cloud service.
  aiEndpoint: ''
};
