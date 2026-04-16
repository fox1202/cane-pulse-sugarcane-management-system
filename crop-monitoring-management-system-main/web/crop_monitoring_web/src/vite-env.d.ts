/// <reference types="vite/client" />

declare module '*.png' {
    const value: string;
    export default value;
}

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_S2DR3_TILE_URL_TEMPLATE?: string
    readonly VITE_S2DR3_ATTRIBUTION?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
