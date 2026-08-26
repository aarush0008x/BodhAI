-- Migration for BodhAI Advanced Admin Control Center & Platform System
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS admin_permissions (
    id TEXT PRIMARY KEY,
    permission_key TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly REAL DEFAULT 0,
    message_limit INTEGER DEFAULT 30,
    model_access TEXT DEFAULT 'all',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_period_end DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_method TEXT DEFAULT 'MANUAL_UPI',
    utr_reference TEXT UNIQUE,
    status TEXT DEFAULT 'PENDING',
    admin_reviewer TEXT,
    review_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    model_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'cloudflare',
    description TEXT,
    enabled INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    status TEXT DEFAULT 'active',
    required_plan TEXT DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    target_role TEXT DEFAULT 'all'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    ip_address TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);
