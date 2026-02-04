import OpenAI from 'openai';

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export const CATEGORIES = {
  OA_REQUIRED: { 
    name: 'Online Assessment', 
    color: '#E63946', 
    description: 'Requires completing a coding test or assessment'
  },
  INTERVIEW_SCHEDULE: { 
    name: 'Schedule Interview', 
    color: '#2A9D8F', 
    description: 'Action needed to schedule an interview'
  },
  INTERVIEW_CONFIRMATION: { 
    name: 'Interview Confirmed', 
    color: '#457B9D', 
    description: 'Interview date/time confirmed'
  },
  APPLICATION_RECEIVED: { 
    name: 'Application Received', 
    color: '#6C757D', 
    description: 'Acknowledgement of application submission'
  },
  REJECTION: { 
    name: 'Rejection', 
    color: '#343A40', 
    description: 'Application was not successful'
  },
  OFFER: { 
    name: 'Offer', 
    color: '#2DC653', 
    description: 'Job offer received'
  },
  FOLLOW_UP: { 
    name: 'Follow Up Needed', 
    color: '#F4A261', 
    description: 'Requires a response or action from you'
  },
  RECRUITER_OUTREACH: { 
    name: 'Recruiter Outreach', 
    color: '#7209B7', 
    description: 'Initial contact from a recruiter or job opportunity'
  },
  STATUS_UPDATE: { 
    name: 'Status Update', 
    color: '#4895EF', 
    description: 'Update on application progress'
  },
  NOT_JOB_RELATED: { 
    name: 'Not Job Related', 
    color: '#ADB5BD', 
    description: 'Email not related to job applications'
  }
};

export async function categorizeEmail(emailData) {
  const results = await categorizeEmailsBatch([emailData]);
  return results[0];
}

export async function categorizeEmailsBatch(emailsData) {
  if (emailsData.length === 0) return [];
  
  // Process in smaller batches for better accuracy
  if (emailsData.length > 5) {
    const results = [];
    for (let i = 0; i < emailsData.length; i += 5) {
      const batch = emailsData.slice(i, i + 5);
      const batchResults = await categorizeEmailsBatch(batch);
      results.push(...batchResults);
      if (i + 5 < emailsData.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return results;
  }
  
  const emailDescriptions = emailsData.map((email, index) => {
    const body = email.body ? email.body.substring(0, 1200) : '';
    return `[EMAIL ${index + 1}]
FROM: ${email.from}
SUBJECT: ${email.subject}
BODY: ${email.snippet} ${body}`;
  }).join('\n\n');
  
  const prompt = `Categorize each email into exactly ONE category.

CATEGORY RULES (check in this order, use FIRST match):
1. REJECTION - "regret to inform", "not selected", "not moving forward", "decided not to proceed", "other candidates", "position filled", "unfortunately", "will not be moving forward", "not be able to offer"
2. OFFER - Explicit job offer with compensation/salary details
3. OA_REQUIRED - Contains coding challenge link (HackerRank, Codility, CodeSignal, LeetCode) or assessment request
4. INTERVIEW_SCHEDULE - Asking to pick/schedule interview time
5. INTERVIEW_CONFIRMATION - Interview already scheduled with specific date/time
6. FOLLOW_UP - Requesting documents, references, or specific action from you
7. APPLICATION_RECEIVED - "thank you for applying", "thanks for your interest", "application received", "we received your application" (ONLY if no rejection language)
8. RECRUITER_OUTREACH - Cold outreach, job board emails (SWE List, Simplify), "your profile matches"
9. NOT_JOB_RELATED - Piazza, school forums, LinkedIn notifications, social media
10. STATUS_UPDATE - ONLY if none of above fit. Mid-process updates like "still reviewing", "moved to next round"

CRITICAL RULES:
- "regret to inform" or "not been selected" = REJECTION (never STATUS_UPDATE)
- "thank you for your interest" + rejection language = REJECTION
- "thank you for applying" alone = APPLICATION_RECEIVED

${emailDescriptions}

JSON array response (no markdown):
[{"email":1,"category":"CATEGORY","confidence":0.9,"company":"Name","action_needed":null}]`;

  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
        {
          role: 'system',
          content: 'Categorize job emails. CRITICAL RULES: "regret to inform" or "not selected" = REJECTION. "Thank you for applying" without rejection = APPLICATION_RECEIVED. STATUS_UPDATE is ONLY for mid-process updates like "still reviewing". Respond with JSON array only.'
        },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 150 * emailsData.length
      });
      
      const content = response.choices[0].message.content.trim();
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      const results = JSON.parse(jsonStr);
      
      return emailsData.map((emailData, index) => {
        const result = results.find(r => r.email === index + 1) || results[index];
        
        if (!result || !CATEGORIES[result.category]) {
          return {
            category: 'STATUS_UPDATE',
            categoryInfo: CATEGORIES.STATUS_UPDATE,
            confidence: 0.3,
            company: null,
            actionNeeded: null
          };
        }
        
        return {
          category: result.category,
          categoryInfo: CATEGORIES[result.category],
          confidence: result.confidence,
          company: result.company,
          actionNeeded: result.action_needed
        };
      });
      
    } catch (error) {
      lastError = error;
      
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after-ms'] || 2000 * (attempt + 1);
        console.log(`Rate limited, waiting ${retryAfter}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter)));
        continue;
      }
      
      console.error('Categorization error:', error.message);
      break;
    }
  }
  
  return emailsData.map(() => ({
    category: 'STATUS_UPDATE',
    categoryInfo: CATEGORIES.STATUS_UPDATE,
    confidence: 0.3,
    company: null,
    actionNeeded: null,
    error: lastError?.message || 'Categorization failed'
  }));
}
