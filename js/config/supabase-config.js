(function initializeSupabaseConfig(namespace) {
    // Browser code may use a project URL and publishable key, never a secret key.
    const SUPABASE_URL = "https://cyjgonlsovzfeehuqqdg.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ouW_zQnIPW-nucHRZ7O6Lw_FWrYH86V";

    namespace.supabaseConfig = Object.freeze({
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    });
}(window.GoTienda = window.GoTienda || {}));
