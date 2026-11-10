import { defineConfig, loadEnv } from 'vite';
import { readSupabaseConfig } from './src/lib/supabase-config.js';

export default defineConfig(({ mode }) => {
  const config=readSupabaseConfig(loadEnv(mode,process.cwd(),'VITE_'));
  // Stop before Vite can embed a private or unrecognised key in browser output.
  if (config.status==='invalid') {
    throw new Error('Supabase browser configuration rejected. Use an HTTPS project URL and a public publishable/anon key only. Credential values are not logged.');
  }
  return {};
});
