import { Router } from 'express';
import { google } from 'googleapis';
import { storeUserTokens } from '../services/pubsub.js';
import { upsertUser, getCompletedActions } from '../services/database.js';

const router = Router();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

router.get('/google', (req, res) => {
  const oauth2Client = getOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }
  
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    req.session.tokens = tokens;
    req.session.user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    };
    
    await upsertUser({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });
    
    storeUserTokens(userInfo.email, tokens);
    await setupGmailWatch(oauth2Client, userInfo.email);
    
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

async function setupGmailWatch(oauth2Client, userEmail) {
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.PUBSUB_TOPIC_NAME) {
    return null;
  }
  
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/${process.env.PUBSUB_TOPIC_NAME}`,
        labelIds: ['INBOX']
      }
    });
    
    return watchResponse.data;
  } catch (error) {
    console.error('Gmail watch setup failed:', error.message);
    return null;
  }
}

router.get('/me', async (req, res) => {
  if (req.session.user && req.session.tokens) {
    const completedActions = await getCompletedActions(req.session.user.email);
    
    res.json({
      authenticated: true,
      user: req.session.user,
      completedActions
    });
  } else {
    res.json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router;
