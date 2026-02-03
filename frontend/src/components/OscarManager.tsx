import React, { useState, useEffect } from 'react';
import './OscarManager.css';

interface Broadcast {
  channel_id: string;
  channel_name: string;
  channel_icon: string;
  time: string;
  date: string;
  description?: string;
}

interface OscarProgram {
  title: string;
  title_en: string;
  year: number;
  winner: number;
  nominee: number;
  winner_categories: string[];
  nominee_categories: string[];
  poster_path?: string;
  broadcasts: Broadcast[];
}

interface BlacklistEntry {
  key: string;
  title: string;
  channel_id: string | null;
  scope: 'channel' | 'all';
}

const OscarManager: React.FC = () => {
  const [programs, setPrograms] = useState<OscarProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);

  const fetchOscarPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/oscars');
      if (!response.ok) throw new Error('Failed to fetch Oscar programs');
      const data = await response.json();
      setPrograms(data.programs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOscarPrograms();
  }, []);

  const fetchBlacklist = async () => {
    try {
      setLoadingBlacklist(true);
      const response = await fetch('/api/oscars/blacklist');
      if (!response.ok) throw new Error('Failed to fetch blacklist');
      const data = await response.json();
      setBlacklist(data.blacklist || []);
    } catch (err) {
      console.error('Failed to load blacklist:', err);
      setBlacklist([]);
    } finally {
      setLoadingBlacklist(false);
    }
  };

  const handleToggleExcluded = () => {
    const newValue = !showExcluded;
    setShowExcluded(newValue);
    if (newValue) {
      fetchBlacklist();
    }
  };

  const handleExclude = async (program: OscarProgram, channelId?: string) => {
    const channelInfo = channelId ? ` on ${program.broadcasts.find(b => b.channel_id === channelId)?.channel_name}` : ' on all channels';
    if (!window.confirm(`Exclude "${program.title}"${channelInfo} from Oscar matches?\n\nNote: You need to click "Refresh Today's Programs" to see updated results.`)) {
      return;
    }

    try {
      const response = await fetch('/api/oscars/exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: program.title,
          channel_id: channelId || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to exclude program');

      alert(`✓ Excluded "${program.title}"${channelInfo}.\n\nClick "Refresh Today's Programs" to update the list.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to exclude program');
    }
  };

  const handleUnexclude = async (entry: BlacklistEntry) => {
    const scope = entry.scope === 'all' ? 'all channels' : `channel ${entry.channel_id}`;
    if (!window.confirm(`Remove "${entry.title}" from blacklist (${scope})?`)) {
      return;
    }

    try {
      const response = await fetch('/api/oscars/exclude', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          channel_id: entry.channel_id || undefined
        })
      });

      if (!response.ok) throw new Error('Failed to unexclude program');

      // Refresh blacklist
      await fetchBlacklist();
      alert(`✓ Removed "${entry.title}" from blacklist.\n\nClick "Refresh Today's Programs" to see it reappear.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unexclude program');
    }
  };

  const handleRefetchToday = async () => {
    if (!window.confirm('Fetch fresh TV programs for TODAY?\n\nThis will scrape the latest data and apply all exclusions.')) {
      return;
    }

    try {
      setFetching(true);
      setFetchMessage(null);

      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_path: 'Днес' })
      });

      if (!response.ok) throw new Error('Failed to fetch programs');

      const data = await response.json();
      setFetchMessage(`✓ Fetched ${data.metadata?.channels_with_programs || 0} channels. Refreshing Oscar list...`);

      // Wait a bit for the data to be processed
      setTimeout(async () => {
        await fetchOscarPrograms();
        setFetchMessage('✓ Oscar list updated!');
        setTimeout(() => setFetchMessage(null), 3000);
      }, 1000);
    } catch (err) {
      setFetchMessage(`✗ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTimeout(() => setFetchMessage(null), 5000);
    } finally {
      setFetching(false);
    }
  };

  const getPosterUrl = (posterPath?: string): string | undefined => {
    if (!posterPath) return undefined;
    return `https://image.tmdb.org/t/p/w185${posterPath}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('bg-BG', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="oscar-manager">
        <div className="loading">Loading Oscar programs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oscar-manager">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  const totalWins = programs.reduce((sum, p) => sum + p.winner, 0);
  const totalNominations = programs.reduce((sum, p) => sum + p.nominee, 0);

  return (
    <div className="oscar-manager">
      <div className="oscar-header">
        <h2>🏆 Oscar Movies on TV</h2>
        <div className="oscar-summary">
          <div className="summary-stat">
            <div className="stat-number">{programs.length}</div>
            <div className="stat-label">Movies Found</div>
          </div>
          <div className="summary-stat">
            <div className="stat-number">{totalWins}</div>
            <div className="stat-label">Total Wins</div>
          </div>
          <div className="summary-stat">
            <div className="stat-number">{totalNominations}</div>
            <div className="stat-label">Total Nominations</div>
          </div>
        </div>
        <div className="header-actions">
          <a href="/" className="back-link">← Back to Programs</a>
          <button
            className="refresh-button"
            onClick={handleRefetchToday}
            disabled={fetching}
          >
            {fetching ? '⏳ Fetching...' : '🔄 Refresh Today\'s Programs'}
          </button>
          <button
            className="toggle-excluded-button"
            onClick={handleToggleExcluded}
          >
            {showExcluded ? 'Show Oscar Movies' : 'Show False Positives'}
          </button>
        </div>
        {fetchMessage && (
          <div className={`fetch-message ${fetchMessage.startsWith('✗') ? 'error' : 'success'}`}>
            {fetchMessage}
          </div>
        )}
      </div>

      {!showExcluded ? (
        <div className="oscar-list">
          {programs.map((program, index) => (
            <div key={index} className="oscar-item">
              <div className="oscar-poster-small">
                {program.poster_path ? (
                  <img
                    src={getPosterUrl(program.poster_path)}
                    alt={program.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="no-poster">🎬</div>
                )}
              </div>

              <div className="oscar-info">
                <div className="oscar-title-row">
                  <h3>{program.title}</h3>
                  {program.title_en && (
                    <span className="title-en">{program.title_en} ({program.year})</span>
                  )}
                </div>

                <div className="oscar-badges">
                  {program.winner > 0 && (
                    <span className="badge winner">
                      🏆 {program.winner} Win{program.winner !== 1 ? 's' : ''}
                    </span>
                  )}
                  {program.nominee > 0 && (
                    <span className="badge nominee">
                      ⭐ {program.nominee} Nomination{program.nominee !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="oscar-broadcasts">
                  <div className="broadcasts-label">Showing on:</div>
                  {program.broadcasts.map((broadcast, bIndex) => (
                    <div key={bIndex} className="broadcast-item">
                      <div className="broadcast-content">
                        <div className="broadcast-info">
                          {broadcast.channel_icon ? (
                            <img
                              src={broadcast.channel_icon}
                              alt={broadcast.channel_name}
                              className="channel-icon"
                              title={broadcast.channel_name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const span = document.createElement('span');
                                  span.className = 'channel';
                                  span.textContent = broadcast.channel_name;
                                  parent.insertBefore(span, e.target as HTMLImageElement);
                                }
                              }}
                            />
                          ) : (
                            <span className="channel">{broadcast.channel_name}</span>
                          )}
                          <span className="separator">•</span>
                          <span className="date">{formatDate(broadcast.date)}</span>
                          <span className="separator">•</span>
                          <span className="time">{broadcast.time}</span>
                        </div>
                        {broadcast.description && (
                          <div className="broadcast-description">{broadcast.description}</div>
                        )}
                      </div>
                      <button
                        className="exclude-button-inline"
                        onClick={() => handleExclude(program, broadcast.channel_id)}
                        title="Exclude this broadcast"
                      >
                        ✖
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="exclude-button-all"
                  onClick={() => handleExclude(program)}
                  title="Exclude from all channels"
                >
                  ✖ Exclude from All Channels
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="blacklist-view">
          <h3 className="blacklist-title">Excluded Programs (False Positives)</h3>
          {loadingBlacklist ? (
            <div className="loading">Loading blacklist...</div>
          ) : blacklist.length > 0 ? (
            <div className="blacklist-list">
              {blacklist.map((entry, index) => (
                <div key={index} className="blacklist-item">
                  <div className="blacklist-info">
                    <div className="blacklist-title-text">{entry.title}</div>
                    <div className="blacklist-scope">
                      {entry.scope === 'all' ? (
                        <span className="scope-badge all">All Channels</span>
                      ) : (
                        <span className="scope-badge channel">Channel: {entry.channel_id}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="unexclude-button"
                    onClick={() => handleUnexclude(entry)}
                    title="Remove from blacklist"
                  >
                    ↩ Restore
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No excluded programs.</p>
              <p className="hint">Programs you mark as false positives will appear here.</p>
            </div>
          )}
        </div>
      )}

      {programs.length === 0 && (
        <div className="empty-state">
          <p>No Oscar-nominated programs found in the last 7 days.</p>
          <p className="hint">Check back after fetching new program data.</p>
        </div>
      )}
    </div>
  );
};

export default OscarManager;
