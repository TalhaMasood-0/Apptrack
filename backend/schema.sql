CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  gmail_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  thread_id VARCHAR(255),
  from_address TEXT,
  subject TEXT,
  snippet TEXT,
  date TIMESTAMP,
  category VARCHAR(50),
  category_confidence DECIMAL(3,2),
  company VARCHAR(255),
  action_needed TEXT,
  is_action_complete BOOLEAN DEFAULT FALSE,
  relevance_score INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gmail_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_email);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(user_email, category);
CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(user_email, date DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_emails_updated_at ON emails;
CREATE TRIGGER update_emails_updated_at
    BEFORE UPDATE ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
