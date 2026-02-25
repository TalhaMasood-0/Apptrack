import { Router } from 'express';
import { google } from 'googleapis';
import { categorizeEmail, categorizeEmailsBatch, CATEGORIES } from '../services/ai.js';
import { calculateRelevanceScore, filterJobRelatedEmails } from '../services/filter.js';
import { 
  upsertEmail, getEmailCategoriesBatch, updateEmailCategory, 
  toggleActionComplete, isConnected as dbConnected, getAllCategorizedEmails 
} from '../services/database.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function getAuthenticatedClient(tokens) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

router.get('/categories', (req, res) => {
  res.json(CATEGORIES);
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const oauth2Client = getAuthenticatedClient(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const userEmail = req.session.user.email;
    
    const { maxResults = 50, pageToken, filterJobs = 'true' } = req.query;
    
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: parseInt(maxResults),
      pageToken,
      labelIds: ['INBOX']
    });
    
    if (!listResponse.data.messages) {
      return res.json({ emails: [], nextPageToken: null });
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
        
        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: fullMessage.data.snippet,
          from: getHeader('From'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          labelIds: fullMessage.data.labelIds
        };
      })
    );
    
    const gmailIds = emails.map(e => e.id);
    const storedCategories = await getEmailCategoriesBatch(gmailIds, userEmail);
    
    let resultEmails = emails.map(email => ({
      ...email,
      relevance: calculateRelevanceScore(email),
      storedCategory: storedCategories[email.id] || null
    }));
    
    if (filterJobs === 'true') {
      resultEmails = resultEmails.filter(email => 
        email.relevance.score >= 6 || email.storedCategory !== null
      );
      
      // Include older categorized emails from database that aren't in current Gmail fetch
      if (dbConnected()) {
        const dbEmails = await getAllCategorizedEmails(userEmail);
        const existingIds = new Set(resultEmails.map(e => e.id));
        const olderCategorizedEmails = dbEmails.filter(e => !existingIds.has(e.id));
        
        if (olderCategorizedEmails.length > 0) {
          console.log(`Adding ${olderCategorizedEmails.length} older categorized emails from database`);
          resultEmails = [...resultEmails, ...olderCategorizedEmails];
        }
      }
    }
    
    res.json({
      emails: resultEmails,
      totalFetched: emails.length,
      jobRelatedCount: resultEmails.length,
      nextPageToken: listResponse.data.nextPageToken
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const oauth2Client = getAuthenticatedClient(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: req.params.id,
      format: 'full'
    });
    
    const headers = message.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
    
    let body = '';
    if (message.data.payload.body.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
    } else if (message.data.payload.parts) {
      const textPart = message.data.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }
    
    const emailData = {
      id: message.data.id,
      threadId: message.data.threadId,
      snippet: message.data.snippet,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body,
      labelIds: message.data.labelIds
    };
    
    emailData.relevance = calculateRelevanceScore(emailData);
    
    res.json(emailData);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

router.post('/:id/categorize', requireAuth, async (req, res) => {
  try {
    const oauth2Client = getAuthenticatedClient(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const userEmail = req.session.user.email;
    
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: req.params.id,
      format: 'full'
    });
    
    const headers = message.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
    
    let body = '';
    if (message.data.payload.body.data) {
      body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
    } else if (message.data.payload.parts) {
      const textPart = message.data.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }
    
    const emailData = {
      from: getHeader('From'),
      subject: getHeader('Subject'),
      snippet: message.data.snippet,
      body: body.substring(0, 2000)
    };
    
    const relevance = calculateRelevanceScore(emailData);
    
    const { force } = req.query;
    if (relevance.score < 0 && force !== 'true') {
      return res.json({
        emailId: req.params.id,
        category: 'NOT_JOB_RELATED',
        categoryInfo: CATEGORIES.NOT_JOB_RELATED,
        confidence: 0.8,
        skippedAI: true,
        relevance
      });
    }
    
    const category = await categorizeEmail(emailData);
    
    if (dbConnected()) {
      await upsertEmail({
        gmailId: req.params.id,
        userEmail,
        threadId: message.data.threadId,
        from: getHeader('From'),
        subject: getHeader('Subject'),
        snippet: message.data.snippet,
        date: new Date(getHeader('Date')),
        category: category.category,
        confidence: category.confidence,
        company: category.company,
        actionNeeded: category.actionNeeded,
        relevanceScore: relevance.score
      });
    }
    
    res.json({
      emailId: req.params.id,
      ...category,
      relevance
    });
  } catch (error) {
    console.error('Error categorizing email:', error);
    res.status(500).json({ error: 'Failed to categorize email' });
  }
});

router.post('/categorize-batch', requireAuth, async (req, res) => {
  try {
    const { emailIds } = req.body;
    
    if (!emailIds || !Array.isArray(emailIds)) {
      return res.status(400).json({ error: 'emailIds array required' });
    }
    
    if (emailIds.length === 0) {
      return res.json({ results: [], stats: { total: 0, processed: 0, categorizedWithAI: 0, skippedLowRelevance: 0, errors: 0 } });
    }
    
    const oauth2Client = getAuthenticatedClient(req.session.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const userEmail = req.session.user.email;
    
    const batchIds = emailIds.slice(0, 10);
    
    const emailsData = await Promise.all(
      batchIds.map(async (id) => {
        try {
          const message = await gmail.users.messages.get({
            userId: 'me',
            id,
            format: 'full'
          });
          
          const headers = message.data.payload.headers;
          const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
          
          let body = '';
          if (message.data.payload.body.data) {
            body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
          } else if (message.data.payload.parts) {
            const textPart = message.data.payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          }
          
          return {
            id,
            threadId: message.data.threadId,
            from: getHeader('From'),
            subject: getHeader('Subject'),
            snippet: message.data.snippet,
            body: body.substring(0, 2000),
            date: getHeader('Date'),
            relevance: calculateRelevanceScore({ from: getHeader('From'), subject: getHeader('Subject'), snippet: message.data.snippet })
          };
        } catch (err) {
          return { id, error: err.message };
        }
      })
    );
    
    const validEmails = emailsData.filter(e => !e.error && e.relevance.score >= 0);
    const errorEmails = emailsData.filter(e => e.error);
    const lowRelevanceEmails = emailsData.filter(e => !e.error && e.relevance.score < 0);
    
    const categories = await categorizeEmailsBatch(validEmails);
    
    const results = [];
    
    for (let i = 0; i < validEmails.length; i++) {
      const email = validEmails[i];
      const category = categories[i];
      
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
      
      results.push({
        emailId: email.id,
        ...category,
        relevance: email.relevance
      });
    }
    
    for (const email of lowRelevanceEmails) {
      results.push({
        emailId: email.id,
        category: 'NOT_JOB_RELATED',
        categoryInfo: CATEGORIES.NOT_JOB_RELATED,
        skippedAI: true,
        relevance: email.relevance
      });
    }
    
    for (const email of errorEmails) {
      results.push({
        emailId: email.id,
        error: email.error
      });
    }
    
    res.json({
      results,
      stats: {
        total: emailIds.length,
        processed: batchIds.length,
        categorizedWithAI: validEmails.length,
        skippedLowRelevance: lowRelevanceEmails.length,
        errors: errorEmails.length
      }
    });
  } catch (error) {
    console.error('Error batch categorizing:', error);
    res.status(500).json({ error: 'Failed to categorize emails' });
  }
});

router.post('/:id/toggle-complete', requireAuth, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const gmailId = req.params.id;
    
    if (!dbConnected()) {
      return res.status(400).json({ error: 'Database not connected' });
    }
    
    const isComplete = await toggleActionComplete(gmailId, userEmail);
    
    res.json({ emailId: gmailId, isActionComplete: isComplete });
  } catch (error) {
    console.error('Error toggling complete:', error);
    res.status(500).json({ error: 'Failed to toggle complete status' });
  }
});

router.post('/:id/set-category', requireAuth, async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const gmailId = req.params.id;
    const { category } = req.body;
    
    if (!category || !CATEGORIES[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    if (!dbConnected()) {
      return res.status(400).json({ error: 'Database not connected' });
    }
    
    await updateEmailCategory(gmailId, userEmail, category);
    
    res.json({ 
      emailId: gmailId, 
      category,
      categoryInfo: CATEGORIES[category],
      confidence: 1.0,
      manual: true
    });
  } catch (error) {
    console.error('Error setting category:', error);
    res.status(500).json({ error: 'Failed to set category' });
  }
});

export default router;
