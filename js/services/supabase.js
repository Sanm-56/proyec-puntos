(function initializeSupabase(namespace) {
    const config = namespace.supabaseConfig || {};
    const hasConfiguration = Boolean(config.SUPABASE_URL && config.SUPABASE_PUBLISHABLE_KEY);
    let client = null;
    let status = "not-configured";

    if (hasConfiguration && window.supabase && typeof window.supabase.createClient === "function") {
        try {
            client = window.supabase.createClient(
                config.SUPABASE_URL,
                config.SUPABASE_PUBLISHABLE_KEY
            );
            status = "initialized";
        } catch (error) {
            status = "initialization-failed";
        }
    } else if (hasConfiguration) {
        status = "library-unavailable";
    }

    namespace.supabase = Object.freeze({
        client,
        getStatus: () => status,
        isAvailable: () => status === "initialized" && client !== null
    });
}(window.GoTienda = window.GoTienda || {}));
