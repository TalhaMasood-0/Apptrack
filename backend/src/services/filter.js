const JOB_KEYWORDS = {
  veryStrong: [
    'interview', 'candidate', 'position', 'hiring manager',
    'recruiter', 'recruiting', 'talent', 'hr ',
    'hackerrank', 'codility', 'codesignal', 'leetcode', 'hirevue',
    'online assessment', 'coding challenge', 'technical screen', 'take-home',
    'offer letter', 'compensation package', 'start date', 'background check',
    'phone screen', 'technical interview', 'onsite interview', 'final round',
    'we are pleased', 'we regret', 'move forward', 'next steps',
    'your application', 'application status', 'application received',
    'thank you for applying', 'thanks for applying', 'thank you for your interest',
    'thank you for your application', 'we received your application',
    'internship', 'internships', 'new internship', 'posted today',
    'job alert', 'job posting', 'new jobs', 'new positions'
  ],
  
  strong: [
    'resume', 'cv ', 'applied', 'applying', 'apply now', 'apply today',
    'job', 'role', 'opportunity', 'career', 'employment',
    'software', 'developer', 'engineer', 'programmer', 'swe',
    'full-time', 'part-time', 'new grad', 'entry level',
    'senior', 'junior', 'staff', 'principal', 'lead', 'manager',
    'remote work', 'remote position', 'hybrid', 'on-site', 'onsite',
    'salary', 'hourly', 'per hour', 'compensation', 'benefits', 'pto',
    'unfortunately', 'regret to inform', 'other candidates', 'not selected',
    'excited to', 'pleased to', 'delighted', 'congratulations',
    'job description', 'view job', 'see job', 'job details', 'learn more',
    'good fit', 'great fit', 'good match', 'great match',
    'your background', 'your skills', 'your experience', 'your profile',
    'schedule a call', 'schedule a time', 'book a time', 'calendly',
    'ai trainer', 'data annotation', 'annotator',
    'daily update', 'job board', 'tech jobs', 'tech internship',
    'summer intern', 'fall intern', 'spring intern', 'winter intern'
  ],
  
  moderate: [
    'team', 'company', 'organization', 'startup', 'tech',
    'openings', 'open role', 'looking for', 'seeking',
    'experience', 'skills', 'qualifications', 'requirements',
    'linkedin', 'workday', 'greenhouse', 'lever', 'icims', 'ashby',
    'schedule', 'availability', 'calendar', 'slot',
    'python', 'java', 'javascript', 'typescript', 'react', 'node',
    'c++', 'golang', 'rust', 'sql', 'aws', 'azure', 'gcp',
    'backend', 'frontend', 'full stack', 'fullstack', 'devops', 'sre',
    'data science', 'machine learning', 'ml ', 'ai ',
    'flexible', 'competitive', 'market rate',
    'work from home', 'wfh', 'fully remote'
  ]
};

const SPAM_KEYWORDS = [
  'unsubscribe from all marketing',
  'order has shipped', 'tracking number', 'delivery status',
  'reset your password', 'verify your email address',
  'invoice #', 'payment receipt', 'billing statement',
  'you won', 'claim your prize', 'act now limited time',
  'crypto investment', 'bitcoin opportunity'
];

const NOT_JOB_SENDERS = [
  'piazza', 'no-reply@piazza',
  'digest-noreply@quora',
  'notification@facebookmail',
  'noreply@discord',
  'noreply@reddit'
];

const NOT_JOB_PATTERNS = [
  'viewed your profile', 'connection request', 'accepted your invitation',
  'commented on your post', 'liked your post', 'mentioned you',
  'new post in', 'digest for', 'weekly digest',
  'appeared in search', 'who viewed', 'your network'
];

const JOB_SENDER_PATTERNS = [
  'recruit', 'talent', 'hiring', 'careers', 'jobs', 'hr@', 'people',
  'opportunities', 'staffing', 'workforce',
  'indeed', 'glassdoor', 'ziprecruiter', 'monster',
  'lever', 'greenhouse', 'workday', 'icims', 'smartrecruiters', 
  'ashby', 'gem.com', 'beamery', 'phenom',
  'hackerrank', 'codility', 'codesignal', 'hirevue', 'karat',
  'dataannotation', 'remotasks', 'turing', 'toptal', 'upwork', 
  'wellfound', 'angel', 'hired', 'triplebyte', 'interviewing.io',
  'swelist', 'simplify', 'pitt csc', 'levels.fyi',
  'handshake', 'ripplematch', 'wayup', 'untapped', 'jumpstart'
];

export function calculateRelevanceScore(email) {
  const { from, subject, snippet } = email;
  const text = `${subject || ''} ${snippet || ''}`.toLowerCase();
  const fromLower = (from || '').toLowerCase();
  const subjectLower = (subject || '').toLowerCase();
  
  let score = 0;
  const reasons = [];
  
  for (const sender of NOT_JOB_SENDERS) {
    if (fromLower.includes(sender)) {
      return { score: -100, isJobRelated: false, confidence: 1, reasons: [`Excluded sender: ${sender}`] };
    }
  }
  
  for (const pattern of NOT_JOB_PATTERNS) {
    if (text.includes(pattern) || subjectLower.includes(pattern)) {
      score -= 50;
      reasons.push(`Not job: "${pattern}"`);
    }
  }
  
  for (const pattern of JOB_SENDER_PATTERNS) {
    if (fromLower.includes(pattern)) {
      score += 20;
      reasons.push(`Sender: ${pattern}`);
      break;
    }
  }
  
  for (const keyword of JOB_KEYWORDS.veryStrong) {
    if (text.includes(keyword) || subjectLower.includes(keyword)) {
      score += 15;
      reasons.push(`Strong: "${keyword}"`);
    }
  }
  
  for (const keyword of JOB_KEYWORDS.strong) {
    if (text.includes(keyword) || subjectLower.includes(keyword)) {
      score += 8;
      if (reasons.length < 5) reasons.push(`Match: "${keyword}"`);
    }
  }
  
  for (const keyword of JOB_KEYWORDS.moderate) {
    if (text.includes(keyword)) {
      score += 4;
    }
  }
  
  for (const keyword of SPAM_KEYWORDS) {
    if (text.includes(keyword)) {
      score -= 15;
      reasons.push(`Spam: "${keyword}"`);
    }
  }
  
  const jobSubjectPatterns = [
    'application', 'interview', 'opportunity', 'position', 'role',
    'job', 'career', 'offer', 'assessment', 'next steps',
    'your profile', 'your background', 'match', 'fit'
  ];
  
  for (const pattern of jobSubjectPatterns) {
    if (subjectLower.includes(pattern)) {
      score += 10;
      break;
    }
  }
  
  return {
    score,
    isJobRelated: score >= 6,
    confidence: Math.min(score / 30, 1),
    reasons: reasons.slice(0, 5)
  };
}

export function filterJobRelatedEmails(emails, threshold = 6) {
  return emails
    .map(email => ({
      ...email,
      relevance: calculateRelevanceScore(email)
    }))
    .filter(email => email.relevance.score >= threshold)
    .sort((a, b) => b.relevance.score - a.relevance.score);
}

export function isLikelyJobEmail(email) {
  const { score } = calculateRelevanceScore(email);
  return score >= 6;
}
