import pg from 'pg';
const { Pool } = pg;

let pool = null;

export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set, using in-memory storage');
    return false;
  }
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected');
    
    await createTables();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    pool = null;
    return false;
  }
}

async function createTables() {
  await pool.query(`
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
    )
  `);
  
  await pool.query(`
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
    )
  `);
  
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(user_email, category)`);
}

export async function upsertUser(userData) {
  if (!pool) return null;
  
  const { email, name, picture, accessToken, refreshToken, tokenExpiry } = userData;
  
  const result = await pool.query(`
    INSERT INTO users (email, name, picture, access_token, refresh_token, token_expiry, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    ON CONFLICT (email) 
    DO UPDATE SET 
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expiry = EXCLUDED.token_expiry,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [email, name, picture, accessToken, refreshToken, tokenExpiry]);
  
  return result.rows[0];
}

export async function getUserByEmail(email) {
  if (!pool) return null;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function getUserTokens(email) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  
  return {
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: user.token_expiry ? new Date(user.token_expiry).getTime() : null
  };
}

export async function upsertEmail(emailData) {
  if (!pool) return null;
  
  const {
    gmailId, userEmail, threadId, from, subject, snippet, date,
    category, confidence, company, actionNeeded, relevanceScore
  } = emailData;
  
  const result = await pool.query(`
    INSERT INTO emails (
      gmail_id, user_email, thread_id, from_address, subject, snippet, date,
      category, category_confidence, company, action_needed, relevance_score, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
    ON CONFLICT (gmail_id, user_email)
    DO UPDATE SET
      category = COALESCE(EXCLUDED.category, emails.category),
      category_confidence = COALESCE(EXCLUDED.category_confidence, emails.category_confidence),
      company = COALESCE(EXCLUDED.company, emails.company),
      action_needed = COALESCE(EXCLUDED.action_needed, emails.action_needed),
      relevance_score = COALESCE(EXCLUDED.relevance_score, emails.relevance_score),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [gmailId, userEmail, threadId, from, subject, snippet, date,
      category, confidence, company, actionNeeded, relevanceScore]);
  
  return result.rows[0];
}

export async function upsertEmailsBatch(emails) {
  if (!pool || emails.length === 0) return [];
  
  const results = [];
  for (const email of emails) {
    const result = await upsertEmail(email);
    if (result) results.push(result);
  }
  return results;
}

export async function getEmailsByUser(userEmail, options = {}) {
  if (!pool) return [];
  
  const { category, limit = 100 } = options;
  
  let query = 'SELECT * FROM emails WHERE user_email = $1';
  const params = [userEmail];
  
  if (category) {
    query += ' AND category = $2';
    params.push(category);
  }
  
  query += ' ORDER BY date DESC LIMIT $' + (params.length + 1);
  params.push(limit);
  
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getEmailCategory(gmailId, userEmail) {
  if (!pool) return null;
  
  const result = await pool.query(
    'SELECT category, category_confidence, company, action_needed, is_action_complete FROM emails WHERE gmail_id = $1 AND user_email = $2',
    [gmailId, userEmail]
  );
  
  return result.rows[0] || null;
}

export async function getEmailCategoriesBatch(gmailIds, userEmail) {
  if (!pool || gmailIds.length === 0) return {};
  
  const result = await pool.query(
    'SELECT gmail_id, category, category_confidence, company, action_needed, is_action_complete FROM emails WHERE gmail_id = ANY($1) AND user_email = $2',
    [gmailIds, userEmail]
  );
  
  const categories = {};
  for (const row of result.rows) {
    categories[row.gmail_id] = {
      category: row.category,
      confidence: parseFloat(row.category_confidence),
      company: row.company,
      actionNeeded: row.action_needed,
      isActionComplete: row.is_action_complete
    };
  }
  return categories;
}

export async function updateEmailCategory(gmailId, userEmail, categoryData) {
  if (!pool) return null;
  
  const { category, confidence, company, actionNeeded } = categoryData;
  
  const result = await pool.query(`
    UPDATE emails 
    SET category = $1, category_confidence = $2, company = $3, action_needed = $4, updated_at = CURRENT_TIMESTAMP
    WHERE gmail_id = $5 AND user_email = $6
    RETURNING *
  `, [category, confidence, company, actionNeeded, gmailId, userEmail]);
  
  return result.rows[0];
}

export async function toggleActionComplete(gmailId, userEmail) {
  if (!pool) return null;
  
  const result = await pool.query(`
    UPDATE emails 
    SET is_action_complete = NOT is_action_complete, updated_at = CURRENT_TIMESTAMP
    WHERE gmail_id = $1 AND user_email = $2
    RETURNING is_action_complete
  `, [gmailId, userEmail]);
  
  return result.rows[0]?.is_action_complete;
}

export async function getCompletedActions(userEmail) {
  if (!pool) return {};
  
  const result = await pool.query(
    'SELECT gmail_id FROM emails WHERE user_email = $1 AND is_action_complete = TRUE',
    [userEmail]
  );
  
  const completed = {};
  for (const row of result.rows) {
    completed[row.gmail_id] = true;
  }
  return completed;
}

export function isConnected() {
  return pool !== null;
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}
