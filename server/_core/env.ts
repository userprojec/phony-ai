export const ENV = {
    aiappPlatformOrigin: process.env.AI_APP_PLATFORM_ORIGIN__ ?? 'https://ai-app.dingtalk.com',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    appId: process.env.APP_ID ?? '',
    corpId: process.env.CORP_ID ?? '',
    bucketName: process.env.BUCKET_NAME ?? '',
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL ?? 'https://phoney.ai-app.pub',
    devMode: (process.env.DEV_MODE ?? '').trim() === 'true' || process.env.NODE_ENV === 'development',
}