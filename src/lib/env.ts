const optional = (value: string | undefined) => (value && value.length > 0 ? value : null);

export const env = {
  supabaseUrl: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  aiProvider: optional(process.env.AI_PROVIDER) ?? "openai",
  openAiApiKey: optional(process.env.OPENAI_API_KEY),
  anthropicApiKey: optional(process.env.ANTHROPIC_API_KEY),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isOpenAiConfigured = Boolean(env.openAiApiKey);
export const isAnthropicConfigured = Boolean(env.anthropicApiKey);
