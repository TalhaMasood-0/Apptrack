import './Privacy.css';

function Privacy() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: February 2026</p>

        <section>
          <h2>What AppTrack Does</h2>
          <p>
            AppTrack connects to your Gmail account to help you organize job application emails. 
            We read your emails to categorize them into groups like "Interview Scheduled," 
            "Application Received," and "Offer."
          </p>
        </section>

        <section>
          <h2>Data We Access</h2>
          <ul>
            <li><strong>Email metadata:</strong> Sender, subject, date</li>
            <li><strong>Email content:</strong> Body text for categorization</li>
            <li><strong>Google profile:</strong> Name, email address, profile picture</li>
          </ul>
        </section>

        <section>
          <h2>How We Use Your Data</h2>
          <ul>
            <li>Display your emails in the AppTrack dashboard</li>
            <li>Send email content to OpenAI for categorization</li>
            <li>Store category assignments in our database</li>
          </ul>
        </section>

        <section>
          <h2>Data Storage</h2>
          <ul>
            <li>Email categories and metadata are stored in our PostgreSQL database</li>
            <li>Your Google OAuth tokens are stored securely</li>
            <li>We do not store full email content permanently</li>
          </ul>
        </section>

        <section>
          <h2>Third-Party Services</h2>
          <ul>
            <li><strong>Google Gmail API:</strong> To access your emails</li>
            <li><strong>OpenAI:</strong> To categorize email content</li>
            <li><strong>Amazon Web Services:</strong> To host the application</li>
          </ul>
        </section>

        <section>
          <h2>Data Sharing</h2>
          <p>
            We do not sell your data. Email content is sent to OpenAI for categorization 
            but is not used to train their models (per OpenAI's API data usage policy).
          </p>
        </section>

        <section>
          <h2>Your Rights</h2>
          <ul>
            <li>Revoke access anytime via Google Account settings</li>
            <li>Request deletion of your stored data</li>
            <li>Export your categorization data</li>
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions? Contact us at <a href="mailto:talhamasood1011@gmail.com">talhamasood1011@gmail.com</a>
          </p>
        </section>

        <div className="back-link">
          <a href="/">← Back to AppTrack</a>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
