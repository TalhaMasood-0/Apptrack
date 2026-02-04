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
  
  const emailDescriptions = emailsData.map((email, index) => {
    return `EMAIL ${index + 1}:
From: ${email.from}
Subject: ${email.subject}
Preview: ${email.snippet}
${email.body ? `Content: ${email.body.substring(0, 500)}` : ''}`;
  }).join('\n\n---\n\n');
  
  const prompt = `Categorize these job search emails. Pick ONE category per email.

CATEGORIES:
- APPLICATION_RECEIVED: Use this for ANY email that acknowledges receiving an application. Keywords: "thank you for applying", "thanks for your interest", "we received your application", "application submitted", "application confirmed", "we will review", "our team will review". Even if it mentions next steps or timeline, if it's primarily an acknowledgment, use this.
- OA_REQUIRED: Contains a link to coding challenge (HackerRank, Codility, LeetCode, CodeSignal, etc.) or take-home assignment
- INTERVIEW_SCHEDULE: Asking YOU to pick/schedule a time for interview
- INTERVIEW_CONFIRMATION: Interview is already scheduled with specific date/time
- REJECTION: "Moving forward with other candidates", "position filled", "not selected", "unfortunately"
- OFFER: Explicit job offer with compensation/salary details
- FOLLOW_UP: Requesting documents, references, or action from you (not just "we'll be in touch")
- RECRUITER_OUTREACH: Cold outreach, "your profile matches", job board newsletters (SWE List, Simplify)
- STATUS_UPDATE: ONLY use this for mid-process updates like "still reviewing", "moved to next round" that don't fit above. Do NOT use for application acknowledgments.
- NOT_JOB_RELATED: Piazza, school forums, LinkedIn notifications (views, connections, likes)

CRITICAL: If email says "thank you for applying" or "thank you for your interest" -> APPLICATION_RECEIVED, never STATUS_UPDATE

${emailDescriptions}

Respond with a JSON array containing one object per email IN ORDER:
[
  {"email": 1, "category": "CATEGORY_NAME", "confidence": 0.95, "company": "Company Name or null", "action_needed": "Brief action if any or null"},
  {"email": 2, "category": "CATEGORY_NAME", "confidence": 0.90, "company": "Company Name or null", "action_needed": "Brief action if any or null"}
]

Respond ONLY with the JSON array, no markdown or explanation.`;

  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
        {
          role: 'system',
          content: 'Categorize job emails. CRITICAL: "Thank you for applying/your interest" = APPLICATION_RECEIVED (never STATUS_UPDATE). STATUS_UPDATE is only for mid-process updates. Respond with JSON array only.'
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
