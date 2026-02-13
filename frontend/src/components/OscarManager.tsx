import React, { useState, useEffect, useMemo } from 'react';
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

interface OscarListRow {
  title: string;
  title_en: string;
  year: number;
}

interface ScannerMatch {
  date: string;
  time: string;
  channel_name: string;
  channel_id: string;
  program_title: string;
  matched_title_en: string;
  matched_title_bg: string;
  year: number;
  isExcluded?: boolean;
}

interface ScannerProgress {
  processed: number;
  total: number;
  channel: string;
  program: string;
}

interface RawProgram {
  title?: string;
  time?: string;
}

interface RawChannelData {
  channel?: {
    name?: string;
  };
  programs?: RawProgram[];
}

interface RawDateData {
  programs?: Record<string, RawChannelData>;
}

type RawPrograms7Days = Record<string, RawDateData>;

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
  const [isListDialogOpen, setIsListDialogOpen] = useState<boolean>(false);
  const [listSearchTerm, setListSearchTerm] = useState<string>('');
  const [showAllTitles, setShowAllTitles] = useState<boolean>(false);
  const [allTitles, setAllTitles] = useState<OscarListRow[]>([]);
  const [loadingAllTitles, setLoadingAllTitles] = useState<boolean>(false);
  const [allTitlesError, setAllTitlesError] = useState<string | null>(null);
  const [isScannerDialogOpen, setIsScannerDialogOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMatches, setScanMatches] = useState<ScannerMatch[]>([]);
  const [latestScanMatchId, setLatestScanMatchId] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<ScannerProgress>({
    processed: 0,
    total: 0,
    channel: '',
    program: '',
  });
  const [listSort, setListSort] = useState<{
    key: 'year' | 'title_en' | 'title';
    direction: 'asc' | 'desc';
  }>({ key: 'year', direction: 'desc' });
  const [totalCatalogCount, setTotalCatalogCount] = useState<number | null>(null);

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
    fetchTotalCatalogCount();
  }, []);

  const fetchTotalCatalogCount = async () => {
    try {
      const response = await fetch('/api/oscars/catalog');
      if (!response.ok) return;
      const data = await response.json();
      setTotalCatalogCount(data.programs?.length || 0);
    } catch (err) {
      console.error('Failed to fetch catalog count:', err);
    }
  };

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

  const fetchAllTitlesCatalog = async (): Promise<OscarListRow[]> => {
    try {
      setLoadingAllTitles(true);
      setAllTitlesError(null);
      const response = await fetch('/api/oscars/catalog');
      if (!response.ok) throw new Error('Failed to fetch full Oscar list');
      const data = await response.json();
      const titles = data.programs || [];
      setAllTitles(titles);
      return titles;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setAllTitlesError(message);
      return [];
    } finally {
      setLoadingAllTitles(false);
    }
  };

  useEffect(() => {
    if (!showAllTitles || allTitles.length > 0 || loadingAllTitles) return;
    fetchAllTitlesCatalog();
  }, [showAllTitles, allTitles.length, loadingAllTitles]);

  const listSourcePrograms = useMemo<OscarListRow[]>(() => {
    if (showAllTitles) return allTitles;
    return programs.map((program) => ({
      title: program.title,
      title_en: program.title_en || '',
      year: Number(program.year) || 0,
    }));
  }, [showAllTitles, allTitles, programs]);

  const sortedListPrograms = useMemo(() => {
    const term = listSearchTerm.trim().toLowerCase();
    const filtered = !term
      ? listSourcePrograms
      : listSourcePrograms.filter((program) => {
      return (
        String(program.year).includes(term) ||
        program.title.toLowerCase().includes(term) ||
        program.title_en.toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;
      if (listSort.key === 'year') {
        result = a.year - b.year;
      } else if (listSort.key === 'title_en') {
        result = a.title_en.localeCompare(b.title_en, 'en', { sensitivity: 'base' });
      } else {
        result = a.title.localeCompare(b.title, 'bg', { sensitivity: 'base' });
      }
      return listSort.direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [listSourcePrograms, listSearchTerm, listSort]);

  const handleListSort = (key: 'year' | 'title_en' | 'title') => {
    setListSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIndicator = (key: 'year' | 'title_en' | 'title') => {
    if (listSort.key !== key) return '↕';
    return listSort.direction === 'asc' ? '↑' : '↓';
  };

  const getPosterUrl = (posterPath?: string): string | undefined => {
    if (!posterPath) return undefined;
    return `https://image.tmdb.org/t/p/w185${posterPath}`;
  };

  useEffect(() => {
    setIsWatchExpanded(false);
  }, [modalProgram]);

  useEffect(() => {
    if (!isListDialogOpen && !isScannerDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsListDialogOpen(false);
        setIsScannerDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListDialogOpen, isScannerDialogOpen]);

  const normalizeTitle = (text: string): string => {
    const cleaned = Array.from(text)
      .map((ch) => (/\p{L}|\p{N}/u.test(ch) ? ch.toLowerCase() : ' '))
      .join('');
    return cleaned.replace(/\s+/g, ' ').trim();
  };

  const stripEpisodeSuffix = (title: string): string => {
    return title.replace(/[, ]*(сез\.|сезон|сез|еп\.|епизод|еп)\s*\d+.*$/i, '').trim();
  };

  const runScanner = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanMatches([]);
    setScanProgress({ processed: 0, total: 0, channel: '', program: '' });

    try {
      const catalog = allTitles.length > 0 ? allTitles : await fetchAllTitlesCatalog();
      if (!catalog.length) {
        throw new Error('Oscar catalog is empty');
      }

      // Fetch blacklist
      let currentBlacklist: BlacklistEntry[] = [];
      try {
        const blacklistResponse = await fetch('/api/oscars/blacklist');
        if (blacklistResponse.ok) {
          const blacklistData = await blacklistResponse.json();
          currentBlacklist = blacklistData.blacklist || [];
        }
      } catch (err) {
        console.error('Failed to fetch blacklist for scanner:', err);
      }

      const titleIndex = new Map<string, OscarListRow[]>();
      for (const movie of catalog) {
        for (const candidate of [movie.title, movie.title_en]) {
          const key = normalizeTitle(candidate || '');
          if (!key) continue;
          const existing = titleIndex.get(key) || [];
          existing.push(movie);
          titleIndex.set(key, existing);
        }
      }

      const response = await fetch('/api/programs/7days');
      if (!response.ok) throw new Error('Failed to fetch 7-day programs');
      const payload = (await response.json()) as RawPrograms7Days;

      const dates = Object.keys(payload).sort();
      let totalPrograms = 0;
      for (const date of dates) {
        const channels = payload[date]?.programs || {};
        for (const channelData of Object.values(channels)) {
          totalPrograms += channelData.programs?.length || 0;
        }
      }

      let processed = 0;
      for (const date of dates) {
        const channels = payload[date]?.programs || {};
        for (const [channelId, channelData] of Object.entries(channels)) {
          const channelName = channelData.channel?.name || channelId;
          const channelPrograms = channelData.programs || [];

          for (const program of channelPrograms) {
            const programTitle = program.title || '';
            const normalized = normalizeTitle(stripEpisodeSuffix(programTitle));
            const candidates = titleIndex.get(normalized) || [];

            processed += 1;
            if (processed % 10 === 0 || processed === totalPrograms) {
              setScanProgress({
                processed,
                total: totalPrograms,
                channel: channelName,
                program: programTitle,
              });
              await new Promise((resolve) => setTimeout(resolve, 0));
            }

            if (candidates.length !== 1) continue;
            const matchMovie = candidates[0];

            // Check if excluded
            const isExcluded = currentBlacklist.some((entry) => {
              if (entry.title !== matchMovie.title) return false;
              if (entry.scope === 'all') return true;
              if (entry.scope === 'channel' && entry.channel_id === channelId) return true;
              if (entry.scope === 'broadcast' &&
                  entry.channel_id === channelId &&
                  entry.date === date &&
                  entry.time === program.time) return true;
              return false;
            });

            setScanProgress({
              processed,
              total: totalPrograms,
              channel: channelName,
              program: isExcluded ? `⚠️ ${programTitle}` : `🏆 ${programTitle}`,
            });
            const matchId = `${date}-${program.time || ''}-${channelName}-${programTitle}`;
            setLatestScanMatchId(matchId);
            setScanMatches((prev) => [
              {
                date,
                time: program.time || '',
                channel_name: channelName,
                channel_id: channelId,
                program_title: programTitle,
                matched_title_en: matchMovie.title_en || '',
                matched_title_bg: matchMovie.title || '',
                year: matchMovie.year || 0,
                isExcluded,
              },
              ...prev,
            ]);
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Unknown scan error');
    } finally {
      setIsScanning(false);
    }
  };

  const clearScannerResults = () => {
    setScanMatches([]);
    setLatestScanMatchId('');
    setScanError(null);
    setScanProgress({ processed: 0, total: 0, channel: '', program: '' });
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
          <div className="summary-stat">
            <div className="stat-number">{totalCatalogCount ?? '…'}</div>
            <div className="stat-label">Unique Titles</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="oscar-list-link"
            onClick={() => setIsListDialogOpen(true)}
          >
            List
          </button>
          <button
            type="button"
            className="oscar-scanner-link"
            onClick={() => setIsScannerDialogOpen(true)}
          >
            Scanner
          </button>
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

      {isListDialogOpen && (
        <div
          className="oscar-modal-overlay"
          onClick={() => setIsListDialogOpen(false)}
        >
          <div
            className="oscar-list-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Oscar titles table"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="oscar-modal-close"
              onClick={() => setIsListDialogOpen(false)}
              aria-label="Close Oscar list"
            >
              ×
            </button>

            <div className="oscar-list-dialog-content">
              <div className="oscar-list-header">
                <h3>🎬 Oscar Titles</h3>
                <span className="oscar-list-count-badge">
                  {showAllTitles
                    ? listSourcePrograms.length > 0
                      ? `${listSourcePrograms.length} titles`
                      : '…'
                    : `${listSourcePrograms.length} on TV`}
                </span>
              </div>
              <div className="oscar-list-toolbar">
                <label className="oscar-list-switch">
                  <input
                    type="checkbox"
                    checked={showAllTitles}
                    onChange={(e) => setShowAllTitles(e.target.checked)}
                  />
                  <span className="oscar-list-switch-track" aria-hidden="true">
                    <span className="oscar-list-switch-thumb" />
                  </span>
                  <span className="oscar-list-switch-text">
                    {showAllTitles ? 'Full catalog' : 'On TV only'}
                  </span>
                </label>
                <div className="oscar-list-search-wrapper">
                  <span className="oscar-list-search-icon">🔍</span>
                  <input
                    type="text"
                    className="oscar-list-search"
                    placeholder="Search year, English or Bulgarian title…"
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                  />
                  {listSearchTerm && (
                    <button
                      type="button"
                      className="oscar-list-search-clear"
                      onClick={() => setListSearchTerm('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {loadingAllTitles && showAllTitles ? (
                <div className="oscar-list-empty">
                  <span className="oscar-list-empty-icon">⏳</span>
                  Loading full Oscar list…
                </div>
              ) : allTitlesError && showAllTitles ? (
                <div className="oscar-list-empty oscar-list-empty-error">
                  <span className="oscar-list-empty-icon">⚠️</span>
                  {allTitlesError}
                </div>
              ) : sortedListPrograms.length === 0 ? (
                <div className="oscar-list-empty">
                  <span className="oscar-list-empty-icon">🔎</span>
                  No movies match your search.
                </div>
              ) : (
                <div className="oscar-list-table-wrapper">
                  <table className="oscar-list-table">
                    <colgroup>
                      <col className="oscar-col-year" />
                      <col className="oscar-col-title-en" />
                      <col className="oscar-col-title-bg" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>
                          <button
                            type="button"
                            className="oscar-list-sort-button"
                            onClick={() => handleListSort('year')}
                          >
                            Year {getSortIndicator('year')}
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="oscar-list-sort-button"
                            onClick={() => handleListSort('title_en')}
                          >
                            English Title {getSortIndicator('title_en')}
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="oscar-list-sort-button"
                            onClick={() => handleListSort('title')}
                          >
                            Bulgarian Title {getSortIndicator('title')}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedListPrograms.map((program, index) => (
                        <tr key={`${program.title_en}-${program.year}-${index}`}>
                          <td>{program.year}</td>
                          <td className="oscar-title-cell" title={program.title_en}>{program.title_en}</td>
                          <td className="oscar-title-cell" title={program.title}>{program.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sortedListPrograms.length > 0 && (
                <div className="oscar-list-footer">
                  Showing {sortedListPrograms.length}
                  {listSearchTerm.trim() ? ` of ${listSourcePrograms.length}` : ''} titles
                  {listSort.key !== 'year' || listSort.direction !== 'desc'
                    ? ` · sorted by ${listSort.key === 'year' ? 'year' : listSort.key === 'title_en' ? 'English title' : 'Bulgarian title'} ${listSort.direction === 'asc' ? '↑' : '↓'}`
                    : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isScannerDialogOpen && (
        <div
          className="oscar-modal-overlay"
          onClick={() => setIsScannerDialogOpen(false)}
        >
          <div
            className="oscar-scanner-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Oscar title scanner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="oscar-modal-close"
              onClick={() => setIsScannerDialogOpen(false)}
              aria-label="Close scanner"
            >
              ×
            </button>

            <div className="oscar-scanner-content">
              <div className="oscar-scanner-header">
                <h3>📡 Scanner</h3>
                <span className="oscar-scanner-desc">Scan 7-day programs for Oscar title matches</span>
              </div>

              <div className="oscar-scanner-toolbar">
                <div className="oscar-scanner-actions">
                  <button
                    type="button"
                    className="oscar-scan-button"
                    onClick={runScanner}
                    disabled={isScanning}
                  >
                    {isScanning ? '⏳ Scanning…' : '▶ Scan'}
                  </button>
                  {(scanMatches.length > 0 || scanError) && (
                    <button
                      type="button"
                      className="oscar-clear-button"
                      onClick={clearScannerResults}
                      disabled={isScanning}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(isScanning || scanProgress.total > 0) && (
                  <div className="oscar-scanner-stats">
                    <span className="oscar-scanner-stat-pill">
                      {scanProgress.processed}/{scanProgress.total} checked
                    </span>
                    <span className="oscar-scanner-stat-pill oscar-scanner-stat-matches">
                      {scanMatches.length} match{scanMatches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                )}
              </div>

              {isScanning && (
                <div className="oscar-scanner-progress">
                  <div className="oscar-scanner-progress-bar">
                    <div
                      className="oscar-scanner-progress-fill"
                      style={{
                        width: scanProgress.total > 0
                          ? `${Math.round((scanProgress.processed / scanProgress.total) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <div className="oscar-scanner-progress-details">
                    <span>📺 {scanProgress.channel || '—'}</span>
                    <span className="oscar-scanner-progress-program">{scanProgress.program || '—'}</span>
                  </div>
                </div>
              )}

              {scanError && (
                <div className="oscar-list-empty oscar-list-empty-error">
                  <span className="oscar-list-empty-icon">⚠️</span>
                  {scanError}
                </div>
              )}

              {scanMatches.length > 0 ? (
                <div className="oscar-list-table-wrapper">
                  <table className="oscar-list-table oscar-scanner-table">
                    <colgroup>
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '110px' }} />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Channel</th>
                        <th>TV Program</th>
                        <th>Matched (EN / BG)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanMatches.map((item, index) => {
                        const rowId = `${item.date}-${item.time}-${item.channel_name}-${item.program_title}`;
                        const rowClass = [
                          rowId === latestScanMatchId ? 'oscar-scanner-match-row' : '',
                          item.isExcluded ? 'oscar-scanner-excluded-row' : ''
                        ].filter(Boolean).join(' ');
                        return (
                        <tr
                          key={`${item.date}-${item.time}-${item.channel_name}-${index}`}
                          className={rowClass}
                        >
                          <td>{item.date}</td>
                          <td>{item.time || '-'}</td>
                          <td>{item.channel_name}</td>
                          <td className="oscar-title-cell" title={item.program_title}>
                            {item.isExcluded && '⚠️ '}{item.program_title}
                          </td>
                          <td className="oscar-title-cell" title={`${item.matched_title_en} / ${item.matched_title_bg}`}>
                            {item.matched_title_en} / {item.matched_title_bg} ({item.year})
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                !isScanning && !scanError && (
                  <div className="oscar-scanner-idle">
                    <div className="oscar-scanner-idle-icon">📡</div>
                    <div className="oscar-scanner-idle-text">Press <strong>Scan</strong> to search for Oscar movies in the TV schedule</div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OscarManager;
