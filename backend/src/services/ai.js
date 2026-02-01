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
  
  const prompt = `You are categorizing emails for a software engineer tracking their job search.

IMPORTANT: Be INCLUSIVE. If an email is about ANY job/work opportunity, freelance gig, recruiter contact, or career-related matter, it IS job-related.

Categories (pick exactly ONE per email):
- OA_REQUIRED: Contains a coding challenge link, HackerRank, Codility, LeetCode, technical assessment, or take-home assignment
- INTERVIEW_SCHEDULE: Asking to schedule/pick a time for an interview, phone screen, or call
- INTERVIEW_CONFIRMATION: Confirms an interview is scheduled with specific date/time
- APPLICATION_RECEIVED: Simple acknowledgment that an application was received
- REJECTION: "Moving forward with other candidates", position filled, not selected, etc.
- OFFER: Job offer, compensation details, offer letter
- FOLLOW_UP: Requesting documents, references, additional info, or any response needed
- RECRUITER_OUTREACH: Initial contact about a job opportunity, role suggestion, "your profile matches", freelance/gig opportunity (DataAnnotation, Turing, Upwork, etc.), "we have a role", JOB BOARD EMAILS/NEWSLETTERS (SWEList, Simplify, job alerts, new internships posted, daily job updates, etc.)
- STATUS_UPDATE: General update on hiring process without specific action needed
- NOT_JOB_RELATED: ONLY use this for clearly non-job content: shopping receipts, social media notifications, personal emails, bank statements. DO NOT use for job boards, job newsletters, or career-related content

${emailDescriptions}

Respond with a JSON array containing one object per email IN ORDER:
[
  {"email": 1, "category": "CATEGORY_NAME", "confidence": 0.95, "company": "Company Name or null", "action_needed": "Brief action if any or null"},
  {"email": 2, "category": "CATEGORY_NAME", "confidence": 0.90, "company": "Company Name or null", "action_needed": "Brief action if any or null"}
]

Respond ONLY with the JSON array, no markdown or explanation.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You categorize job-related emails in batches. Be INCLUSIVE - freelance, gig work, recruiter outreach, job boards, job newsletters (SWEList, Simplify, etc.), and internship alerts are ALL job-related and should be RECRUITER_OUTREACH. Only mark as NOT_JOB_RELATED if truly unrelated to career/work (shopping, social media, etc.). Respond only with valid JSON array.'
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
    console.error('Categorization error:', error);
    return emailsData.map(() => ({
      category: 'STATUS_UPDATE',
      categoryInfo: CATEGORIES.STATUS_UPDATE,
      confidence: 0.3,
      company: null,
      actionNeeded: null,
      error: 'Categorization failed'
    }));
  }
}
