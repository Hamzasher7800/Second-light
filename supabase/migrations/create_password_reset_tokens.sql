-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to access all rows
CREATE POLICY "Service role can access all password reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for email-based password reset functionality';
COMMENT ON COLUMN password_reset_tokens.email IS 'Email address of the user requesting password reset';
COMMENT ON COLUMN password_reset_tokens.token IS 'Unique token for password reset verification';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Expiration time for the reset token';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether the token has been used for password reset'; 