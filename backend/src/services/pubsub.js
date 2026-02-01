import { PubSub } from '@google-cloud/pubsub';
import { google } from 'googleapis';
import { notifyUser } from './websocket.js';
import { categorizeEmail } from './ai.js';
import { calculateRelevanceScore } from './filter.js';
import { getUserTokens as getDbTokens, upsertEmail, isConnected as dbConnected } from './database.js';

let pubsub;
let subscription;
const memoryTokens = new Map();

export function storeUserTokens(email, tokens) {
  memoryTokens.set(email, tokens);
}

export async function getUserTokens(email) {
  if (dbConnected()) {
    const dbTokens = await getDbTokens(email);
    if (dbTokens) return dbTokens;
  }
  return memoryTokens.get(email);
}

export async function initPubSub() {
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.PUBSUB_SUBSCRIPTION_NAME) {
    console.log('Pub/Sub not configured, real-time notifications disabled');
    return;
  }
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('GOOGLE_APPLICATION_CREDENTIALS not set, Pub/Sub disabled');
    return;
  }
  
  try {
    pubsub = new PubSub({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    const subscriptionName = process.env.PUBSUB_SUBSCRIPTION_NAME;
    subscription = pubsub.subscription(subscriptionName);
    
    subscription.on('message', handleMessage);
    subscription.on('error', (error) => {
      console.error('Pub/Sub error:', error.message);
    });
    
    console.log(`Listening for Gmail notifications on ${subscriptionName}`);
  } catch (error) {
    console.error('Failed to initialize Pub/Sub:', error.message);
  }
}

async function handleMessage(message) {
  try {
    const data = JSON.parse(message.data.toString());
    const { emailAddress, historyId } = data;
    
    console.log(`Gmail notification for ${emailAddress}, historyId: ${historyId}`);
    message.ack();
    
    const tokens = await getUserTokens(emailAddress);
    if (!tokens) {
      console.log(`No tokens stored for ${emailAddress}`);
      return;
    }
    
    const newEmails = await fetchNewEmails(tokens, emailAddress);
    
    if (newEmails.length > 0) {
      notifyUser(emailAddress, {
        type: 'new_emails',
        emails: newEmails,
        count: newEmails.length
      });
    }
    
  } catch (error) {
    console.error('Error processing Pub/Sub message:', error);
    message.ack();
  }
}

async function fetchNewEmails(tokens, userEmail) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
      labelIds: ['INBOX']
    });
    
    if (!listResponse.data.messages) {
      return [];
    }
    
    const emails = await Promise.all(
      listResponse.data.messages.map(async (msg) => {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });
        
        const headers = fullMessage.data.payload.headers;
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
        
        const email = {
          id: msg.id,
          threadId: msg.threadId,
          snippet: fullMessage.data.snippet,
          from: getHeader('From'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          labelIds: fullMessage.data.labelIds,
          isNew: true
        };
        
        email.relevance = calculateRelevanceScore(email);
        
        if (email.relevance.score >= 6) {
          try {
            const category = await categorizeEmail({
              from: email.from,
              subject: email.subject,
              snippet: email.snippet
            });
            email.category = category;
            
            if (dbConnected()) {
              await upsertEmail({
                gmailId: email.id,
                userEmail,
                threadId: email.threadId,
                from: email.from,
                subject: email.subject,
                snippet: email.snippet,
                date: new Date(email.date),
                category: category.category,
                confidence: category.confidence,
                company: category.company,
                actionNeeded: category.actionNeeded,
                relevanceScore: email.relevance.score
              });
            }
          } catch (err) {
            console.error('Auto-categorization failed:', err);
          }
        }
        
        return email;
      })
    );
    
    return emails;
    
  } catch (error) {
    console.error('Error fetching new emails:', error);
    return [];
  }
}

export async function closePubSub() {
  if (subscription) {
    await subscription.close();
  }
}
