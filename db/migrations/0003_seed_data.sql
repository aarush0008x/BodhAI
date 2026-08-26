-- Migration 0003: Seed Default Data for Plans, Models, and Feature Flags

INSERT OR IGNORE INTO plans (id, name, slug, description, price_monthly, message_limit, model_access, active)
VALUES 
('plan-free', 'Free Plan', 'free', 'Standard free tier for individuals', 0, 30, 'all', 1),
('plan-pro', 'Pro Plan', 'pro', 'Higher message limits and priority inference', 499, 500, 'all', 1),
('plan-premium', 'Premium Enterprise', 'premium', 'Unlimited message volume and custom models', 1499, 999999, 'all', 1);

INSERT OR IGNORE INTO models (id, model_id, name, provider, description, enabled, is_default, priority)
VALUES 
('mod-1', '@cf/meta/llama-3.1-8b-instruct-fast', 'BodhAI • Llama 3.1 8B Fast', 'cloudflare', 'Fast, intelligent open-source model running on Workers AI.', 1, 1, 1),
('mod-2', '@cf/meta/llama-3-8b-instruct', 'BodhAI • Llama 3 8B', 'cloudflare', 'Instruction-tuned open-source model.', 1, 0, 2),
('mod-3', '@cf/mistral/mistral-7b-instruct-v0.1', 'BodhAI • Mistral 7B', 'cloudflare', 'Lightweight and ultra-fast instruction model.', 1, 0, 3);

INSERT OR IGNORE INTO feature_flags (id, key, description, enabled, target_role)
VALUES 
('ff-1', 'enable_sse_streaming', 'Enable real-time SSE streaming for chat responses', 1, 'all'),
('ff-2', 'enable_manual_upi', 'Enable manual UPI payment submissions', 1, 'all');
