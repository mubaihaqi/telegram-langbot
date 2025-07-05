import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Pastikan variabel lingkungan ada
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Environment variables SUPABASE_URL and SUPABASE_ANON_KEY are required!"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
