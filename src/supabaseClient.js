import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eayijcgivvjgiukmbxku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XEpZDMF_bphshxYq5w53_g_a3Mg2L5B";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
