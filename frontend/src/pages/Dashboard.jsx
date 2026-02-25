import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import config from '../config';
import { 
  Mail, LogOut, RefreshCw, Sparkles, ChevronRight, X,
  FileText, Calendar, CalendarCheck, Inbox, XCircle,
  Gift, MessageCircle, UserPlus, Bell, HelpCircle,
  Loader2, Check, Filter, AlertCircle, CheckCircle2,
  ExternalLink, Search, Wifi, WifiOff
} from 'lucide-react';
import './Dashboard.css';

const CATEGORY_CONFIG = {
  OFFER: { 
    icon: Gift, 
    color: '#2D8A4E', 
    bg: '#E5F5EB',
    name: 'Offer',
    priority: 1,
    isActionable: true
  },
  OA_REQUIRED: { 
    icon: FileText, 
    color: '#C45D3A', 
    bg: '#FCEAE5',
    name: 'Online Assessment',
    priority: 2,
    isActionable: true
  },
  INTERVIEW_SCHEDULE: { 
    icon: Calendar, 
    color: '#2D7D6F', 
    bg: '#E5F4F2',
    name: 'Schedule Interview',
    priority: 3,
    isActionable: true
  },
  INTERVIEW_CONFIRMATION: { 
    icon: CalendarCheck, 
    color: '#3D6B99', 
    bg: '#E5EEF7',
    name: 'Interview Confirmed',
    priority: 4,
    isActionable: false
  },
  FOLLOW_UP: { 
    icon: MessageCircle, 
    color: '#C9913A', 
    bg: '#FDF4E5',
    name: 'Follow Up Needed',
    priority: 5,
    isActionable: true
  },
  RECRUITER_OUTREACH: { 
    icon: UserPlus, 
    color: '#7B4B94', 
    bg: '#F4EBF7',
    name: 'Recruiter Outreach',
    priority: 6,
    isActionable: false
  },
  APPLICATION_RECEIVED: { 
    icon: Inbox, 
    color: '#7A7A7A', 
    bg: '#F5F5F5',
    name: 'Application Received',
    priority: 7,
    isActionable: false
  },
  STATUS_UPDATE: { 
    icon: Bell, 
    color: '#5B7BB3', 
    bg: '#EBF0F7',
    name: 'Status Update',
    priority: 8,
    isActionable: false
  },
  REJECTION: { 
    icon: XCircle, 
    color: '#4A4A4A', 
    bg: '#EFEFEF',
    name: 'Rejection',
    priority: 9,
    isActionable: false
  },
  NOT_JOB_RELATED: { 
    icon: HelpCircle, 
    color: '#A0A0A0', 
    bg: '#F8F8F8',
    name: 'Not Job Related',
    priority: 10,
    isActionable: false
  }
};

// Strip HTML tags and decode entities for display
function stripHtml(html) {
  if (!html) return '';
  
  let text = html;
  
  // Remove style tags and their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove script tags and their content
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove CSS-like content (body{...}, .class{...}, etc.)
  text = text.replace(/[a-z.#][a-z0-9_-]*\s*\{[^}]*\}/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  const tmp = document.createElement('div');
  tmp.innerHTML = text;
  text = tmp.textContent || tmp.innerText || '';
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorizing, setCategorizing] = useState({});
  const [categorizingAll, setCategorizingAll] = useState(false);
  const [categories, setCategories] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [stats, setStats] = useState({ total: 0, jobRelated: 0 });
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailDetail, setEmailDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmailAlert, setNewEmailAlert] = useState(null);
  const [completedActions, setCompletedActions] = useState({});
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Handle new emails from WebSocket
  const handleNewEmails = useCallback((newEmails) => {
    console.log('Received new emails:', newEmails);
    
    setEmails(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id));
      
      if (uniqueNewEmails.length > 0) {
        setNewEmailAlert(`${uniqueNewEmails.length} new email${uniqueNewEmails.length > 1 ? 's' : ''} received!`);
        setTimeout(() => setNewEmailAlert(null), 5000);
        
        uniqueNewEmails.forEach(email => {
          if (email.category) {
            setCategories(prev => ({ ...prev, [email.id]: email.category }));
          }
        });
        
        return [...uniqueNewEmails, ...prev];
      }
      return prev;
    });
  }, []);

  const { isConnected } = useWebSocket(user?.email, handleNewEmails);

  useEffect(() => {
    fetchEmails();
    loadCompletedActions();
  }, [showAllEmails]);

  async function loadCompletedActions() {
    try {
      const res = await fetch(`${config.apiUrl}/auth/me`, { credentials: 'include' });
      const data = await res.json();
      if (data.completedActions) {
        setCompletedActions(data.completedActions);
      }
    } catch (error) {
      console.error('Failed to load completed actions:', error);
    }
  }

  async function fetchEmails(pageToken = null, append = false) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const filterParam = showAllEmails ? 'false' : 'true';
      let url = `${config.apiUrl}/api/emails?maxResults=100&filterJobs=${filterParam}`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      const fetchedEmails = data.emails || [];
      
      if (append) {
        setEmails(prev => [...prev, ...fetchedEmails]);
      } else {
        setEmails(fetchedEmails);
      }
      
      setNextPageToken(data.nextPageToken || null);
      setStats({
        total: data.totalFetched || fetchedEmails.length,
        jobRelated: data.jobRelatedCount || fetchedEmails.length
      });
      
      const storedCats = {};
      const completedStatus = {};
      
      fetchedEmails.forEach(email => {
        if (email.storedCategory && email.storedCategory.category) {
          storedCats[email.id] = {
            category: email.storedCategory.category,
            categoryInfo: CATEGORY_CONFIG[email.storedCategory.category],
            confidence: email.storedCategory.confidence || 0.8,
            company: email.storedCategory.company,
            actionNeeded: email.storedCategory.actionNeeded
          };
          if (email.storedCategory.isActionComplete) {
            completedStatus[email.id] = true;
          }
        }
      });
      
      if (append) {
        setCategories(prev => ({ ...prev, ...storedCats }));
        setCompletedActions(prev => ({ ...prev, ...completedStatus }));
      } else {
        setCategories(storedCats);
        setCompletedActions(completedStatus);
      }
      
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadMoreEmails() {
    if (nextPageToken && !loadingMore) {
      await fetchEmails(nextPageToken, true);
    }
  }

  async function fetchEmailDetail(emailId) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${config.apiUrl}/api/emails/${emailId}`, { credentials: 'include' });
      const data = await res.json();
      setEmailDetail(data);
    } catch (error) {
      console.error('Failed to fetch email detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function categorizeEmail(emailId, force = false) {
    setCategorizing(prev => ({ ...prev, [emailId]: true }));
    try {
      const url = force 
        ? `${config.apiUrl}/api/emails/${emailId}/categorize?force=true`
        : `${config.apiUrl}/api/emails/${emailId}/categorize`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      setCategories(prev => ({ 
        ...prev, 
        [emailId]: {
          category: data.category,
          categoryInfo: CATEGORY_CONFIG[data.category],
          confidence: data.confidence,
          company: data.company,
          actionNeeded: data.actionNeeded
        }
      }));
    } catch (error) {
      console.error('Categorization failed:', error);
    } finally {
      setCategorizing(prev => ({ ...prev, [emailId]: false }));
    }
  }

  async function categorizeAll() {
    const uncategorized = emails.filter(e => !categories[e.id]).map(e => e.id);
    if (uncategorized.length === 0) return;
    
    setCategorizingAll(true);
    
    const categorizingState = {};
    uncategorized.forEach(id => { categorizingState[id] = true; });
    setCategorizing(prev => ({ ...prev, ...categorizingState }));
    
    try {
      for (let i = 0; i < uncategorized.length; i += 10) {
        const batch = uncategorized.slice(i, i + 10);
        
        const res = await fetch(`${config.apiUrl}/api/emails/categorize-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ emailIds: batch })
        });
        
        if (!res.ok) {
          console.error('Batch request failed:', res.status);
          continue;
        }
        
        const data = await res.json();
        
        if (data.results && Array.isArray(data.results)) {
          const newCategories = {};
          data.results.forEach(result => {
            if (result && result.emailId && !result.error) {
              newCategories[result.emailId] = {
                category: result.category,
                categoryInfo: CATEGORY_CONFIG[result.category],
                confidence: result.confidence,
                company: result.company,
                actionNeeded: result.actionNeeded
              };
            }
          });
          
          if (Object.keys(newCategories).length > 0) {
            setCategories(prev => ({ ...prev, ...newCategories }));
          }
        }
        
        const clearState = {};
        batch.forEach(id => { clearState[id] = false; });
        setCategorizing(prev => ({ ...prev, ...clearState }));
      }
    } catch (error) {
      console.error('Batch categorization failed:', error);
    } finally {
      setCategorizingAll(false);
      setCategorizing({});
    }
  }

  function openEmail(email) {
    setSelectedEmail(email.id);
    fetchEmailDetail(email.id);
  }

  function closeEmailDetail() {
    setSelectedEmail(null);
    setEmailDetail(null);
  }

  async function toggleActionComplete(emailId) {
    try {
      const res = await fetch(`${config.apiUrl}/api/emails/${emailId}/toggle-complete`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      
      setCompletedActions(prev => ({
        ...prev,
        [emailId]: data.isActionComplete
      }));
    } catch (error) {
      // Fallback to local state if DB fails
      setCompletedActions(prev => ({
        ...prev,
        [emailId]: !prev[emailId]
      }));
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatFullDate(dateStr) {
    return new Date(dateStr).toLocaleString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function extractName(from) {
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, '') : from;
  }

  let filteredEmails = [...emails];
  
  if (filter === 'ACTION') {
    filteredEmails = filteredEmails.filter(e => {
      const cat = categories[e.id];
      if (!cat) return false;
      const config = CATEGORY_CONFIG[cat.category];
      return config?.isActionable && !completedActions[e.id];
    });
  } else if (filter !== 'ALL') {
    filteredEmails = filteredEmails.filter(e => categories[e.id]?.category === filter);
  }
  
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredEmails = filteredEmails.filter(e => {
      const searchText = `${e.from} ${e.subject} ${e.snippet}`.toLowerCase();
      return searchText.includes(query);
    });
  }

  const categoryCounts = Object.values(categories).reduce((acc, cat) => {
    if (cat.category) {
      acc[cat.category] = (acc[cat.category] || 0) + 1;
    }
    return acc;
  }, {});

  const actionNeededCount = Object.entries(categories).filter(([emailId, cat]) => {
    const config = CATEGORY_CONFIG[cat.category];
    return config?.isActionable && !completedActions[emailId];
  }).length;

  const uncategorizedCount = emails.filter(e => !categories[e.id]).length;

  const [draggedEmail, setDraggedEmail] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  function handleDragStart(e, emailId) {
    setDraggedEmail(emailId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggedEmail(null);
    setDropTarget(null);
  }

  function handleDragOver(e, category) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(category);
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  async function handleDrop(e, category) {
    e.preventDefault();
    setDropTarget(null);
    
    if (!draggedEmail || !category) return;
    
    try {
      const res = await fetch(`${config.apiUrl}/api/emails/${draggedEmail}/set-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCategories(prev => ({
          ...prev,
          [draggedEmail]: {
            category: data.category,
            categoryInfo: CATEGORY_CONFIG[data.category],
            confidence: 1.0,
            manual: true
          }
        }));
      }
    } catch (error) {
      console.error('Failed to set category:', error);
    }
    
    setDraggedEmail(null);
  }

  return (
    <div className="dashboard">
      {/* New email alert */}
      {newEmailAlert && (
        <div className="new-email-alert">
          <Mail size={16} />
          {newEmailAlert}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="/" className="logo">
            <span className="logo-mark">AT</span>
            <span className="logo-text">AppTrack</span>
          </a>
          <div className={`connection-status ${isConnected ? 'connected' : ''}`} title={isConnected ? 'Real-time connected' : 'Connecting...'}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          </div>
        </div>

        <div className="user-section">
          {user?.picture && <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />}
          <div className="user-info">
            <span className="user-name">{user?.name?.split(' ')[0]}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            <Mail size={18} />
            <span>All Job Emails</span>
            <span className="nav-count">{emails.length}</span>
          </button>

          {actionNeededCount > 0 && (
            <button 
              className={`nav-item action-needed ${filter === 'ACTION' ? 'active' : ''}`}
              onClick={() => setFilter('ACTION')}
            >
              <AlertCircle size={18} />
              <span>Action Needed</span>
              <span className="nav-count highlight">{actionNeededCount}</span>
            </button>
          )}

          <div className="nav-divider">Categories</div>

          {Object.entries(CATEGORY_CONFIG)
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([key, config]) => {
              const Icon = config.icon;
              const count = categoryCounts[key] || 0;
              if (count === 0 && key === 'NOT_JOB_RELATED') return null;
              return (
                <button
                  key={key}
                  className={`nav-item ${filter === key ? 'active' : ''} ${dropTarget === key ? 'drop-target' : ''}`}
                  onClick={() => setFilter(key)}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, key)}
                >
                  <Icon size={18} style={{ color: config.color }} />
                  <span>{config.name}</span>
                  {count > 0 && <span className="nav-count">{count}</span>}
                </button>
              );
            })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-left">
            <h1>
              {filter === 'ALL' ? 'Job Emails' : 
               filter === 'ACTION' ? 'Action Needed' :
               CATEGORY_CONFIG[filter]?.name || 'Emails'}
            </h1>
            <span className="email-count">
              {filteredEmails.length} emails
            </span>
          </div>
          <div className="header-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <label className="filter-toggle">
              <input 
                type="checkbox" 
                checked={showAllEmails}
                onChange={(e) => setShowAllEmails(e.target.checked)}
              />
              <Filter size={16} />
              <span>Show all</span>
            </label>
            <button className="action-btn" onClick={fetchEmails} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>
            <button 
              className="action-btn primary" 
              onClick={categorizeAll}
              disabled={categorizingAll || uncategorizedCount === 0}
            >
              <Sparkles size={18} className={categorizingAll ? 'spinning' : ''} />
              <span>{categorizingAll ? 'Categorizing...' : `Categorize${uncategorizedCount > 0 ? ` (${uncategorizedCount})` : ''}`}</span>
            </button>
          </div>
        </header>

        <div className="email-container">
          {loading ? (
            <div className="loading-state">
              <Loader2 size={28} className="spinning" />
              <p>Loading emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="empty-state">
              <Mail size={40} />
              <p>{searchQuery ? 'No emails match your search' : 'No emails found'}</p>
              <span>{searchQuery ? 'Try a different search term' : 'Try adjusting your filter or refreshing'}</span>
            </div>
          ) : (
            <div className="email-list">
              {filteredEmails.map((email, index) => {
                const category = categories[email.id];
                const config = category ? CATEGORY_CONFIG[category.category] : null;
                const CategoryIcon = config?.icon;
                const isCompleted = completedActions[email.id];
                const isActionable = config?.isActionable;
                const isNew = email.isNew;
                
                return (
                  <div
                    key={email.id}
                    className={`email-item animate-in ${selectedEmail === email.id ? 'selected' : ''} ${isCompleted ? 'completed' : ''} ${isNew ? 'is-new' : ''} ${draggedEmail === email.id ? 'dragging' : ''}`}
                    style={{ animationDelay: `${index * 0.02}s` }}
                    onClick={() => openEmail(email)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, email.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {isNew && <div className="new-badge">NEW</div>}
                    <div className="email-main">
                      <div className="email-top">
                        <span className="email-from">{extractName(email.from)}</span>
                        <span className="email-date">{formatDate(email.date)}</span>
                      </div>
                      <div className="email-subject">{email.subject || '(No subject)'}</div>
                      <div className="email-snippet">{email.snippet}</div>
                    </div>
                    
                    <div className="email-actions">
                      {category ? (
                        <div className="category-action-row">
                          <div 
                            className="category-badge"
                            style={{ 
                              '--cat-color': config?.color,
                              '--cat-bg': config?.bg
                            }}
                          >
                            {CategoryIcon && <CategoryIcon size={14} />}
                            <span>{config?.name}</span>
                          </div>
                          
                          {isActionable && (
                            <button
                              className={`complete-btn ${isCompleted ? 'is-completed' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleActionComplete(email.id);
                              }}
                              title={isCompleted ? 'Mark as not done' : 'Mark as done'}
                            >
                              {isCompleted ? <CheckCircle2 size={18} /> : <Check size={18} />}
                            </button>
                          )}
                        </div>
                      ) : categorizing[email.id] ? (
                        <div className="categorizing-badge">
                          <Loader2 size={14} className="spinning" />
                          <span>Analyzing...</span>
                        </div>
                      ) : (
                        <button 
                          className="categorize-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            categorizeEmail(email.id);
                          }}
                        >
                          <Sparkles size={14} />
                          <span>Categorize</span>
                        </button>
                      )}
                      
                      {category?.company && (
                        <span className="company-tag">{category.company}</span>
                      )}
                    </div>
                    
                    <ChevronRight size={18} className="email-chevron" />
                  </div>
                );
              })}
              
              {nextPageToken && (
                <button 
                  className="load-more-btn"
                  onClick={loadMoreEmails}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="spinning" />
                      Loading...
                    </>
                  ) : (
                    'Load More Emails'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Email Detail Panel */}
      {selectedEmail && (
        <div className="email-detail-overlay" onClick={closeEmailDetail}>
          <div className="email-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h2>Email Details</h2>
              <button className="close-btn" onClick={closeEmailDetail}>
                <X size={20} />
              </button>
            </div>
            
            {loadingDetail ? (
              <div className="detail-loading">
                <Loader2 size={24} className="spinning" />
              </div>
            ) : emailDetail ? (
              <div className="detail-content">
                <div className="detail-meta">
                  <div className="meta-row">
                    <span className="meta-label">From</span>
                    <span className="meta-value">{emailDetail.from}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">To</span>
                    <span className="meta-value">{emailDetail.to}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Date</span>
                    <span className="meta-value">{formatFullDate(emailDetail.date)}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Subject</span>
                    <span className="meta-value subject">{emailDetail.subject}</span>
                  </div>
                </div>
                
                {categories[selectedEmail] ? (
                  <div className="detail-category">
                    <div 
                      className="category-badge large"
                      style={{ 
                        '--cat-color': CATEGORY_CONFIG[categories[selectedEmail].category]?.color,
                        '--cat-bg': CATEGORY_CONFIG[categories[selectedEmail].category]?.bg
                      }}
                    >
                      {CATEGORY_CONFIG[categories[selectedEmail].category]?.name}
                    </div>
                    {categories[selectedEmail].actionNeeded && (
                      <p className="action-needed-text">
                        <AlertCircle size={14} />
                        {categories[selectedEmail].actionNeeded}
                      </p>
                    )}
                    <div className="detail-actions">
                      {CATEGORY_CONFIG[categories[selectedEmail].category]?.isActionable && (
                        <button
                          className={`mark-complete-btn ${completedActions[selectedEmail] ? 'completed' : ''}`}
                          onClick={() => toggleActionComplete(selectedEmail)}
                        >
                          {completedActions[selectedEmail] ? (
                            <>
                              <CheckCircle2 size={16} />
                              Marked as Done
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              Mark as Done
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className="recategorize-btn"
                        onClick={() => categorizeEmail(selectedEmail, true)}
                        disabled={categorizing[selectedEmail]}
                      >
                        {categorizing[selectedEmail] ? (
                          <>
                            <Loader2 size={16} className="spinning" />
                            Re-categorizing...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Re-categorize
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="categorize-detail-btn"
                    onClick={() => categorizeEmail(selectedEmail)}
                    disabled={categorizing[selectedEmail]}
                  >
                    {categorizing[selectedEmail] ? (
                      <>
                        <Loader2 size={16} className="spinning" />
                        Categorizing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Categorize this email
                      </>
                    )}
                  </button>
                )}
                
                <div className="detail-body">
                  <h3>Content</h3>
                  <div className="body-text">
                    {stripHtml(emailDetail.body) || emailDetail.snippet || 'No content available'}
                  </div>
                </div>
                
                <a 
                  href={`https://mail.google.com/mail/u/?authuser=${user?.email}#all/${emailDetail.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="open-gmail-btn"
                >
                  <ExternalLink size={16} />
                  Open in Gmail
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
