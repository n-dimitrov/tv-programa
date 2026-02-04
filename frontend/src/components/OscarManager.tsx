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

interface WatchProvider {
  logo_path?: string;
  provider_id?: number;
  provider_name?: string;
  display_priority?: number;
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
  overview?: string;
  broadcasts: Broadcast[];
  watch?: {
    region?: string;
    link?: string;
    flatrate?: WatchProvider[];
    rent?: WatchProvider[];
    buy?: WatchProvider[];
  };
}

interface BlacklistEntry {
  title: string;
  scope: 'broadcast' | 'channel' | 'all';
  channel_id?: string;
  date?: string;
  time?: string;
  description?: string;
}

const OscarManager: React.FC = () => {
  const [programs, setPrograms] = useState<OscarProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [modalProgram, setModalProgram] = useState<OscarProgram | null>(null);
  const [isWatchExpanded, setIsWatchExpanded] = useState<boolean>(false);

  // Check if admin mode is enabled via URL parameter
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';

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

  const handleExclude = async (
    program: OscarProgram,
    scope: 'broadcast' | 'channel',
    broadcast?: Broadcast
  ) => {
    let confirmMsg = '';
    if (scope === 'broadcast' && broadcast) {
      confirmMsg = `Exclude this specific broadcast?\n\n"${program.title}"\n${broadcast.channel_name} • ${formatDate(broadcast.date)} • ${broadcast.time}\n\nNote: Go to /channels page and fetch programs to see updated results.`;
    } else if (scope === 'channel' && broadcast) {
      confirmMsg = `Exclude "${program.title}" from all airings on ${broadcast.channel_name}?\n\nNote: Go to /channels page and fetch programs to see updated results.`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const body: any = {
        title: program.title,
        scope: scope
      };

      if (broadcast) {
        body.channel_id = broadcast.channel_id;
        if (scope === 'broadcast') {
          body.date = broadcast.date;
          body.time = broadcast.time;
          body.description = broadcast.description;
        }
      }

      const response = await fetch('/api/oscars/exclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to exclude program');

      const scopeLabel = scope === 'broadcast' ? 'this broadcast' : `all on ${broadcast?.channel_name}`;
      alert(`✓ Excluded ${scopeLabel}.\n\nGo to /channels page and click "Fetch Today" or "Fetch Yesterday" to update the list.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to exclude program');
    }
  };

  const handleUnexclude = async (entry: BlacklistEntry) => {
    let scopeLabel = '';
    if (entry.scope === 'all') {
      scopeLabel = 'all channels';
    } else if (entry.scope === 'channel') {
      scopeLabel = `channel ${entry.channel_id}`;
    } else if (entry.scope === 'broadcast') {
      scopeLabel = `broadcast on ${entry.channel_id} at ${entry.date} ${entry.time}`;
    }

    if (!window.confirm(`Remove "${entry.title}" from blacklist (${scopeLabel})?`)) {
      return;
    }

    try {
      const response = await fetch('/api/oscars/exclude', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      if (!response.ok) throw new Error('Failed to unexclude program');

      // Refresh blacklist
      await fetchBlacklist();
      alert(`✓ Removed "${entry.title}" from blacklist.\n\nGo to /channels page and fetch programs to see it reappear.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unexclude program');
    }
  };


  const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';
  const TMDB_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w45';

  const getPosterUrl = (posterPath?: string): string | undefined => {
    if (!posterPath) return undefined;
    return `https://image.tmdb.org/t/p/w185${posterPath}`;
  };

  useEffect(() => {
    setIsWatchExpanded(false);
  }, [modalProgram]);

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
        {isAdmin && (
          <div className="admin-badge">
            🔐 Admin Mode
          </div>
        )}
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
          {isAdmin && (
            <button
              className="toggle-excluded-button"
              onClick={handleToggleExcluded}
            >
              {showExcluded ? 'Show Oscar Movies' : 'Show False Positives'}
            </button>
          )}
        </div>
      </div>

      {!showExcluded ? (
        <div className="oscar-list">
          {programs.map((program, index) => (
            <div key={index} className="oscar-item">
              <div
                className="oscar-poster-small"
                onClick={() => setModalProgram(program)}
                style={{ cursor: 'pointer' }}
                title="Click to view details"
              >
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
                      {isAdmin && (
                        <div className="exclude-buttons">
                          <button
                            className="exclude-button-broadcast"
                            onClick={() => handleExclude(program, 'broadcast', broadcast)}
                            title="Exclude this specific time slot"
                          >
                            ✖ This Time Slot
                          </button>
                          <button
                            className="exclude-button-channel"
                            onClick={() => handleExclude(program, 'channel', broadcast)}
                            title="Exclude all airings on this channel"
                          >
                            ✖ All on {broadcast.channel_name}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                      ) : entry.scope === 'channel' ? (
                        <span className="scope-badge channel">Channel: {entry.channel_id}</span>
                      ) : (
                        <span className="scope-badge broadcast">
                          {entry.channel_id} • {entry.date} • {entry.time}
                        </span>
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

      {modalProgram && (
        <div
          className="oscar-modal-overlay"
          onClick={() => setModalProgram(null)}
        >
          <div
            className="oscar-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="oscar-modal-close"
              onClick={() => setModalProgram(null)}
              aria-label="Close Oscar details"
            >
              ×
            </button>
            <div className="oscar-modal-content">
              {modalProgram.poster_path && (
                <img
                  className="oscar-poster"
                  src={`${TMDB_POSTER_BASE_URL}${modalProgram.poster_path}`}
                  alt={modalProgram.title_en || modalProgram.title}
                />
              )}
              <div className="oscar-details">
                <h3>{modalProgram.title}</h3>
                {modalProgram.title_en && (
                  <div className="oscar-title-en">
                    {modalProgram.title_en}
                    {modalProgram.year && ` (${modalProgram.year})`}
                  </div>
                )}
                {modalProgram.overview && (
                  <p className="oscar-overview">{modalProgram.overview}</p>
                )}
                {modalProgram.watch && (
                  <div className="oscar-watch-group">
                    <button
                      type="button"
                      className="oscar-watch-toggle"
                      onClick={() => setIsWatchExpanded(prev => !prev)}
                      aria-expanded={isWatchExpanded}
                    >
                      <span>Where to watch (BG)</span>
                      <span className="oscar-watch-toggle-icon">{isWatchExpanded ? '–' : '+'}</span>
                    </button>
                    {isWatchExpanded && (
                      <div className="oscar-watch-content">
                        {(['flatrate', 'rent', 'buy'] as const).map((tier) => {
                          const providers = modalProgram.watch?.[tier] || [];
                          if (!providers.length) return null;
                          const label = tier === 'flatrate' ? 'Stream' : tier === 'rent' ? 'Rent' : 'Buy';
                          return (
                            <div key={tier} className="oscar-watch-tier">
                              <div className="oscar-watch-tier-label">{label}</div>
                              <div className="oscar-watch-providers">
                                {providers.map((provider, idx) => (
                                  <div key={`${provider.provider_id ?? 'p'}-${idx}`} className="oscar-watch-provider">
                                    {provider.logo_path && (
                                      <img
                                        className="oscar-watch-logo"
                                        src={`${TMDB_LOGO_BASE_URL}${provider.logo_path}`}
                                        alt={provider.provider_name || 'Provider logo'}
                                        loading="lazy"
                                      />
                                    )}
                                    <span className="oscar-watch-name">{provider.provider_name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div className="oscar-category-group">
                  <h4>Oscar Categories</h4>
                  <div className="oscar-category-grid">
                    {[
                      'Best Picture',
                      'Best Director',
                      'Best Actor',
                      'Best Actress',
                      'Best Supporting Actor',
                      'Best Supporting Actress',
                      'Best Original Screenplay',
                      'Best Adapted Screenplay'
                    ].map((category) => {
                      const isWinner = modalProgram.winner_categories.includes(category);
                      const isNominee = modalProgram.nominee_categories.includes(category);
                      const statusClass = isWinner
                        ? 'oscar-winner'
                        : isNominee
                          ? 'oscar-nominee'
                          : 'oscar-disabled';
                      return (
                        <span key={category} className={`oscar-category ${statusClass}`}>
                          {category}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OscarManager;
