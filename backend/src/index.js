import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync } from 'fs';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import { initPubSub } from './services/pubsub.js';
import { initWebSocket } from './services/websocket.js';
import { initDatabase } from './services/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

let server;
if (isProduction && process.env.SSL_CERT_PATH) {
  const sslOptions = {
    key: readFileSync(process.env.SSL_KEY_PATH),
    cert: readFileSync(process.env.SSL_CERT_PATH)
  };
  server = createHttpsServer(sslOptions, app);
} else {
  server = createServer(app);
}

if (isProduction) {
  app.set('trust proxy', 1);
}

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://apptrack.me',
  'https://www.apptrack.me'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initDatabase();
  initWebSocket(server);
  await initPubSub().catch(console.error);
  
  const listenPort = isProduction && process.env.SSL_CERT_PATH ? 443 : PORT;
  server.listen(listenPort, () => {
    const protocol = isProduction && process.env.SSL_CERT_PATH ? 'https' : 'http';
    console.log(`Server running on ${protocol}://localhost:${listenPort}`);
  });
  
  // HTTP redirect to HTTPS in production
  if (isProduction && process.env.SSL_CERT_PATH) {
    const httpApp = express();
    httpApp.get('*', (req, res) => {
      res.redirect(`https://${req.headers.host}${req.url}`);
    });
    httpApp.listen(80, () => {
      console.log('HTTP redirect server running on port 80');
    });
  }
}

start();
