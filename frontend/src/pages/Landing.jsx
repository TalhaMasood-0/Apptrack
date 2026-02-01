import { Mail, ArrowRight, CheckCircle2, Filter, Brain, Clock } from 'lucide-react';
import './Landing.css';

function Landing() {
  const handleLogin = () => {
    window.location.href = '/auth/google';
  };

  return (
    <div className="landing">
      <header className="header">
        <div className="header-inner">
          <a href="/" className="logo">
            <span className="logo-mark">AT</span>
            <span className="logo-text">AppTrack</span>
          </a>
          <button className="sign-in-btn" onClick={handleLogin}>
            Sign in with Gmail
          </button>
        </div>
      </header>

      <main className="main">
        <section className="hero animate-in">
          <p className="hero-eyebrow">For SWE job seekers</p>
          <h1 className="hero-title">
            Your job search inbox,<br />
            <em>finally organized</em>
          </h1>
          <p className="hero-desc">
            Connect your Gmail and let AI sort through the noise. 
            Know instantly which emails need action — OAs, interviews, offers — 
            and which are just confirmations.
          </p>
          <button className="cta-btn" onClick={handleLogin}>
            <Mail size={20} />
            Connect Gmail
            <ArrowRight size={18} />
          </button>
          <p className="cta-note">Read-only access. We never send emails.</p>
        </section>

        <section className="preview animate-in delay-1">
          <div className="preview-card">
            <div className="preview-header">
              <span className="preview-dot"></span>
              <span className="preview-dot"></span>
              <span className="preview-dot"></span>
            </div>
            <div className="preview-content">
              <div className="email-preview">
                <div className="email-row">
                  <span className="email-tag tag-oa">OA Required</span>
                  <span className="email-sender">Google Recruiting</span>
                  <span className="email-subject">Complete your coding assessment</span>
                </div>
                <div className="email-row">
                  <span className="email-tag tag-interview">Schedule</span>
                  <span className="email-sender">Stripe Talent</span>
                  <span className="email-subject">Interview availability request</span>
                </div>
                <div className="email-row">
                  <span className="email-tag tag-offer">Offer</span>
                  <span className="email-sender">Meta Careers</span>
                  <span className="email-subject">Your offer letter is ready</span>
                </div>
                <div className="email-row dim">
                  <span className="email-tag tag-received">Received</span>
                  <span className="email-sender">Amazon Jobs</span>
                  <span className="email-subject">Application confirmation</span>
                </div>
                <div className="email-row dim">
                  <span className="email-tag tag-received">Received</span>
                  <span className="email-sender">Netflix Recruiting</span>
                  <span className="email-subject">We got your application</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features animate-in delay-2">
          <div className="feature">
            <div className="feature-icon">
              <Filter size={24} />
            </div>
            <h3>Smart Filtering</h3>
            <p>Automatically filters out promotional emails and newsletters. Only job-related emails get processed.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <Brain size={24} />
            </div>
            <h3>AI Categorization</h3>
            <p>GPT identifies OAs, interview requests, offers, and rejections. Know what needs your attention.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <Clock size={24} />
            </div>
            <h3>Action Items</h3>
            <p>See at a glance which emails need a response and what action is required.</p>
          </div>
        </section>

        <section className="categories animate-in delay-3">
          <h2>Categories built for job seekers</h2>
          <div className="category-grid">
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-oa)'}}></span>
              <span>Online Assessment</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-interview-schedule)'}}></span>
              <span>Schedule Interview</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-interview-confirm)'}}></span>
              <span>Interview Confirmed</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-offer)'}}></span>
              <span>Offer</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-followup)'}}></span>
              <span>Follow Up Needed</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-recruiter)'}}></span>
              <span>Recruiter Outreach</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-received)'}}></span>
              <span>Application Received</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: 'var(--cat-rejection)'}}></span>
              <span>Rejection</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer animate-in delay-4">
        <div className="footer-inner">
          <div className="footer-security">
            <CheckCircle2 size={16} />
            <span>OAuth 2.0 secure connection</span>
          </div>
          <div className="footer-security">
            <CheckCircle2 size={16} />
            <span>Read-only Gmail access</span>
          </div>
          <div className="footer-security">
            <CheckCircle2 size={16} />
            <span>No data stored on servers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
