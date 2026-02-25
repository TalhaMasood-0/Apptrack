import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import config from '../config';
import './Landing.css';

function Landing() {
  const handleLogin = () => {
    window.location.href = `${config.apiUrl}/auth/google`;
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
        <section className="hero">
          <h1 className="hero-title">
            Stop digging through your inbox<br />
            for job updates
          </h1>
          <p className="hero-desc">
            Applying to tons of jobs means tons of emails. AppTrack connects to your Gmail 
            and sorts them into categories so you know what actually needs your attention.
          </p>
          <button className="cta-btn" onClick={handleLogin}>
            <Mail size={20} />
            Connect Gmail
            <ArrowRight size={18} />
          </button>
          <p className="cta-note">Read-only access. Your emails stay yours.</p>
        </section>

        <section className="preview">
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
                  <span className="email-sender">Recruiting Team</span>
                  <span className="email-subject">Complete your coding assessment</span>
                </div>
                <div className="email-row">
                  <span className="email-tag tag-interview">Schedule</span>
                  <span className="email-sender">Talent Acquisition</span>
                  <span className="email-subject">Let's schedule your interview</span>
                </div>
                <div className="email-row">
                  <span className="email-tag tag-offer">Offer</span>
                  <span className="email-sender">HR Team</span>
                  <span className="email-subject">Your offer letter</span>
                </div>
                <div className="email-row dim">
                  <span className="email-tag tag-received">Received</span>
                  <span className="email-sender">Careers</span>
                  <span className="email-subject">Thanks for applying</span>
                </div>
                <div className="email-row dim">
                  <span className="email-tag tag-received">Received</span>
                  <span className="email-sender">Jobs</span>
                  <span className="email-subject">Application confirmed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <h2>How it works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <p>Connect your Gmail account</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <p>We scan for job-related emails</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <p>Click categorize to sort them</p>
            </div>
          </div>
        </section>

        <section className="categories">
          <h2>Categories</h2>
          <div className="category-grid">
            <div className="category-item">
              <span className="cat-dot" style={{background: '#2DC653'}}></span>
              <span>Offer</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#E63946'}}></span>
              <span>Online Assessment</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#2A9D8F'}}></span>
              <span>Schedule Interview</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#457B9D'}}></span>
              <span>Interview Confirmed</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#F4A261'}}></span>
              <span>Follow Up Needed</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#7209B7'}}></span>
              <span>Recruiter Outreach</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#6C757D'}}></span>
              <span>Application Received</span>
            </div>
            <div className="category-item">
              <span className="cat-dot" style={{background: '#343A40'}}></span>
              <span>Rejection</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-security">
            <CheckCircle2 size={16} />
            <span>OAuth 2.0</span>
          </div>
          <div className="footer-security">
            <CheckCircle2 size={16} />
            <span>Read-only access</span>
          </div>
          <a href="/privacy" className="footer-link">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
