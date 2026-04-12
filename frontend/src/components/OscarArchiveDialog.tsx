import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface ArchiveProgram {
  date: string;
  time: string;
  channel_name: string;
  channel_icon: string;
}

interface ArchiveMovie {
  title: string;
  title_en: string;
  year: string;
  poster_path?: string;
  tmdb_id?: number;
  overview?: string;
  oscar: {
    winner: number;
    nominee: number;
    winner_categories: string[];
    nominee_categories: string[];
  };
  programs: ArchiveProgram[];
  broadcast_count: number;
}

interface ArchiveChannel {
  channel_name: string;
  channel_icon: string;
  total_movies: number;
  winners_count: number;
  winners: string[];
  nominees_count: number;
  nominees: string[];
}

interface MonthlySummary {
  month: string;
  days_with_data: number;
  total_broadcasts: number;
  unique_movies: number;
  movies: ArchiveMovie[];
  channels: ArchiveChannel[];
}

interface MonthRange {
  start: string;      // "YYYY-MM"
  end: string | null; // null = single month selection
}

interface OscarArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OscarArchiveDialog: React.FC<OscarArchiveDialogProps> = ({ isOpen, onClose }) => {
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<MonthRange>({ start: '', end: null });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'movies' | 'channels'>('movies');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'year' | 'title_en' | 'broadcast_count'>('broadcast_count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [expandedMovies, setExpandedMovies] = useState<Set<number>>(new Set());

  const cache = useRef<Map<string, MonthlySummary>>(new Map());
  const monthsFetched = useRef(false);

  // Helper functions for range selection
  const getMonthsInRange = (start: string, end: string | null): string[] => {
    if (!end || start === end) return [start];
    const months: string[] = [];
    const [startYear, startMonth] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);

    for (let y = startYear; y <= endYear; y++) {
      const monthStart = y === startYear ? startMonth : 1;
      const monthEnd = y === endYear ? endMonth : 12;
      for (let m = monthStart; m <= monthEnd; m++) {
        months.push(`${y}-${m.toString().padStart(2, '0')}`);
      }
    }
    return months;
  };

  const isMonthInRange = (month: string, range: MonthRange): boolean => {
    if (!range.start) return false;
    if (!range.end) return month === range.start;
    return month >= range.start && month <= range.end;
  };

  const getAvailableYears = (months: string[]): number[] => {
    const years = new Set(months.map(m => parseInt(m.split('-')[0], 10)));
    return Array.from(years).sort((a, b) => b - a);
  };

  const formatRangeLabel = (range: MonthRange): string => {
    if (!range.start) return '';
    if (!range.end) return formatMonthLabel(range.start);
    return `${formatMonthLabel(range.start)} → ${formatMonthLabel(range.end)}`;
  };

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await fetch('/api/oscars/monthly/available');
      if (!response.ok) throw new Error('Failed to fetch available months');
      const data = await response.json();
      const months: string[] = data.months || [];
      setAvailableMonths(months);
      if (months.length > 0 && !selectedRange.start) {
        const firstMonth = months[0];
        setSelectedRange({ start: firstMonth, end: null });
        const year = parseInt(firstMonth.split('-')[0], 10);
        setSelectedYear(year);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load available months');
    }
  }, [selectedRange.start]);

  const fetchMonthlySummary = useCallback(async (month: string): Promise<MonthlySummary> => {
    const cached = cache.current.get(month);
    if (cached) {
      return cached;
    }

    const [yearStr, monthStr] = month.split('-');
    const response = await fetch(`/api/oscars/monthly?year=${yearStr}&month=${parseInt(monthStr, 10)}`);
    if (!response.ok) throw new Error('Failed to fetch monthly summary');
    const data: MonthlySummary = await response.json();
    cache.current.set(month, data);
    return data;
  }, []);

  const aggregateSummaries = (summaries: MonthlySummary[], range: MonthRange): MonthlySummary => {
    const normalizeMovieKeyPart = (value?: string | number | null): string => {
      if (value === undefined || value === null) return '';
      return String(value).trim().toLowerCase();
    };

    const getMovieAggregateKey = (movie: ArchiveMovie): string => {
      const tmdb = normalizeMovieKeyPart(movie.tmdb_id);
      const year = normalizeMovieKeyPart(movie.year);
      const titleEn = normalizeMovieKeyPart(movie.title_en);
      const titleBg = normalizeMovieKeyPart(movie.title);

      // Prefer stable IDs when present.
      if (tmdb) return `tmdb:${tmdb}`;
      if (titleEn && year) return `title-en-year:${titleEn}|${year}`;
      if (titleBg && year) return `title-bg-year:${titleBg}|${year}`;
      if (titleEn) return `title-en:${titleEn}`;
      if (titleBg) return `title-bg:${titleBg}`;
      return `unknown:${year || 'n/a'}`;
    };

    // Combine movies (deduplicate with robust key fallback)
    const moviesMap = new Map<string, ArchiveMovie>();
    summaries.forEach(s => {
      s.movies.forEach(m => {
        const key = getMovieAggregateKey(m);
        if (moviesMap.has(key)) {
          const existing = moviesMap.get(key)!;
          existing.programs.push(...m.programs);
          existing.broadcast_count += m.broadcast_count;
          if (!existing.year && m.year) {
            existing.year = m.year;
          }
          if (!existing.tmdb_id && m.tmdb_id) {
            existing.tmdb_id = m.tmdb_id;
          }
        } else {
          moviesMap.set(key, { ...m, programs: [...m.programs] });
        }
      });
    });

    // Combine channels (merge by channel_name)
    const channelsMap = new Map<string, ArchiveChannel>();
    summaries.forEach(s => {
      s.channels.forEach(ch => {
        if (channelsMap.has(ch.channel_name)) {
          const existing = channelsMap.get(ch.channel_name)!;
          existing.total_movies += ch.total_movies;
          existing.winners_count += ch.winners_count;
          existing.nominees_count += ch.nominees_count;
          existing.winners = Array.from(new Set([...existing.winners, ...ch.winners]));
          existing.nominees = Array.from(new Set([...existing.nominees, ...ch.nominees]));
        } else {
          channelsMap.set(ch.channel_name, { ...ch });
        }
      });
    });

    return {
      month: formatRangeLabel(range),
      days_with_data: summaries.reduce((sum, s) => sum + s.days_with_data, 0),
      total_broadcasts: summaries.reduce((sum, s) => sum + s.total_broadcasts, 0),
      unique_movies: moviesMap.size,
      movies: Array.from(moviesMap.values()),
      channels: Array.from(channelsMap.values())
    };
  };

  const fetchRangeData = useCallback(async (range: MonthRange) => {
    if (!range.start) return;

    const months = getMonthsInRange(range.start, range.end);
    setLoading(true);
    setError(null);

    try {
      const summaries = await Promise.all(months.map(m => fetchMonthlySummary(m)));

      if (summaries.length === 1) {
        setSummary(summaries[0]);
      } else {
        const aggregated = aggregateSummaries(summaries, range);
        setSummary(aggregated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly data');
      setSummary(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMonthlySummary]);

  useEffect(() => {
    if (!isOpen) return;
    if (!monthsFetched.current) {
      monthsFetched.current = true;
      fetchAvailableMonths();
    }
  }, [isOpen, fetchAvailableMonths]);

  useEffect(() => {
    if (!isOpen || !selectedRange.start) return;
    fetchRangeData(selectedRange);
  }, [isOpen, selectedRange, fetchRangeData]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatMonthLabel = (month: string): string => {
    if (!month) return '';
    const [y, m] = month.split('-');
    if (!y || !m) return month;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getPosterUrl = (posterPath?: string): string | undefined => {
    if (!posterPath) return undefined;
    return `https://image.tmdb.org/t/p/w185${posterPath}`;
  };

  const handleSort = (key: 'year' | 'title_en' | 'broadcast_count') => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'year' || key === 'broadcast_count' ? 'desc' : 'asc');
    }
  };

  const getSortIndicator = (key: string) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const toggleChannel = (channelName: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(channelName)) next.delete(channelName);
      else next.add(channelName);
      return next;
    });
  };

  const handleMonthClick = (month: string) => {
    if (!selectedRange.start || selectedRange.end) {
      // First click or resetting: set start, clear end
      setSelectedRange({ start: month, end: null });
    } else {
      // Second click: set end (auto-sort to ensure start <= end)
      const [first, second] = [selectedRange.start, month].sort();
      setSelectedRange({ start: first, end: second === first ? null : second });
    }
  };

  const toggleMovieBroadcasts = (index: number) => {
    setExpandedMovies(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const filteredMovies = useMemo(() => {
    if (!summary) return [];
    const term = searchTerm.trim().toLowerCase();
    let movies = summary.movies;
    if (term) {
      movies = movies.filter(m =>
        m.title.toLowerCase().includes(term) ||
        m.title_en.toLowerCase().includes(term) ||
        String(m.year).includes(term)
      );
    }
    return [...movies].sort((a, b) => {
      let result = 0;
      if (sortKey === 'year') {
        result = parseInt(a.year || '0', 10) - parseInt(b.year || '0', 10);
      } else if (sortKey === 'title_en') {
        result = (a.title_en || '').localeCompare(b.title_en || '', 'en', { sensitivity: 'base' });
      } else {
        result = a.broadcast_count - b.broadcast_count;
      }
      return sortDirection === 'asc' ? result : -result;
    });
  }, [summary, searchTerm, sortKey, sortDirection]);

  const filteredChannels = useMemo(() => {
    if (!summary) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return summary.channels;
    return summary.channels.filter(ch =>
      ch.channel_name.toLowerCase().includes(term) ||
      ch.winners.some(t => t.toLowerCase().includes(term)) ||
      ch.nominees.some(t => t.toLowerCase().includes(term))
    );
  }, [summary, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="oscar-modal-overlay" onClick={onClose}>
      <div
        className="oscar-archive-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Monthly Oscar archive"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="oscar-modal-close"
          onClick={onClose}
          aria-label="Close archive"
        >
          ×
        </button>

        <div className="oscar-archive-content">
          <div className="oscar-archive-header">
            <h3>📅 Archive</h3>
            {availableMonths.length > 0 && (
              <select
                className="oscar-archive-year-selector"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {getAvailableYears(availableMonths).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>

          {availableMonths.length > 0 && (
            <>
              <div className="oscar-archive-month-grid">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, idx) => {
                  const monthNum = idx + 1;
                  const monthStr = `${selectedYear}-${monthNum.toString().padStart(2, '0')}`;
                  const isAvailable = availableMonths.includes(monthStr);
                  const isStart = selectedRange.start === monthStr;
                  const isEnd = selectedRange.end === monthStr;
                  const isInRange = isMonthInRange(monthStr, selectedRange);
                  const isActive = !selectedRange.end && selectedRange.start === monthStr;

                  return (
                    <button
                      key={monthStr}
                      type="button"
                      className={`oscar-archive-month-btn ${
                        !isAvailable ? 'month-btn-disabled' :
                        isStart ? 'month-btn-start' :
                        isEnd ? 'month-btn-end' :
                        isInRange ? 'month-btn-in-range' :
                        isActive ? 'month-btn-active' : ''
                      }`}
                      onClick={() => isAvailable && handleMonthClick(monthStr)}
                      disabled={!isAvailable}
                      aria-label={`${label} ${selectedYear}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {selectedRange.start && (
                <div className="oscar-archive-range-label">
                  {selectedRange.end
                    ? `${formatMonthLabel(selectedRange.start)} → ${formatMonthLabel(selectedRange.end)}`
                    : formatMonthLabel(selectedRange.start)
                  }
                </div>
              )}
            </>
          )}

          {summary && !loading && (
            <div className="oscar-archive-stats">
              <span className="oscar-scanner-stat-pill">
                {summary.days_with_data} days
              </span>
              <span className="oscar-scanner-stat-pill">
                {summary.unique_movies} movies
              </span>
              <span className="oscar-scanner-stat-pill">
                {summary.total_broadcasts} broadcasts
              </span>
              <span className="oscar-scanner-stat-pill">
                {summary.channels.length} channels
              </span>
            </div>
          )}

          <div className="oscar-archive-toolbar">
            <div className="oscar-archive-view-toggle">
              <button
                type="button"
                className={activeView === 'movies' ? 'active' : ''}
                onClick={() => setActiveView('movies')}
              >
                Movies
              </button>
              <button
                type="button"
                className={activeView === 'channels' ? 'active' : ''}
                onClick={() => setActiveView('channels')}
              >
                Channels
              </button>
            </div>
            <div className="oscar-list-search-wrapper">
              <span className="oscar-list-search-icon">🔍</span>
              <input
                type="text"
                className="oscar-list-search"
                placeholder={activeView === 'movies' ? 'Search movies...' : 'Search channels...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="oscar-list-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="oscar-list-empty">
              <span className="oscar-list-empty-icon">⏳</span>
              Loading {selectedRange.start ? formatRangeLabel(selectedRange) : 'data'}...
            </div>
          ) : error ? (
            <div className="oscar-list-empty oscar-list-empty-error">
              <span className="oscar-list-empty-icon">⚠️</span>
              {error}
            </div>
          ) : availableMonths.length === 0 ? (
            <div className="oscar-list-empty">
              <span className="oscar-list-empty-icon">📅</span>
              No monthly archives available yet.
            </div>
          ) : activeView === 'movies' ? (
            <>
              {filteredMovies.length > 0 && (
                <div className="oscar-archive-sort-bar">
                  Sort:
                  <button type="button" onClick={() => handleSort('broadcast_count')}>
                    Broadcasts {getSortIndicator('broadcast_count')}
                  </button>
                  <button type="button" onClick={() => handleSort('year')}>
                    Year {getSortIndicator('year')}
                  </button>
                  <button type="button" onClick={() => handleSort('title_en')}>
                    Title {getSortIndicator('title_en')}
                  </button>
                </div>
              )}
              {filteredMovies.length > 0 ? (
                <div className="oscar-archive-movies-list">
                  {filteredMovies.map((movie, index) => (
                    <div key={`${movie.title_en}-${movie.year}-${index}`} className="oscar-archive-movie-card">
                      <div className="oscar-poster-small">
                        {movie.poster_path ? (
                          <img
                            src={getPosterUrl(movie.poster_path)}
                            alt={movie.title}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="no-poster">🎬</div>
                        )}
                      </div>
                      <div className="oscar-archive-movie-info">
                        <div className="oscar-title-row">
                          <h4>{movie.title}</h4>
                          {movie.title_en && (
                            <span className="title-en">{movie.title_en} ({movie.year})</span>
                          )}
                        </div>
                        <div className="oscar-badges">
                          {movie.oscar.winner > 0 && (
                            <span className="badge winner">
                              🏆 {movie.oscar.winner} Win{movie.oscar.winner !== 1 ? 's' : ''}
                            </span>
                          )}
                          {movie.oscar.nominee > 0 && (
                            <span className="badge nominee">
                              ⭐ {movie.oscar.nominee} Nom{movie.oscar.nominee !== 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="oscar-archive-broadcast-badge">
                            📺 {movie.broadcast_count}×
                          </span>
                        </div>
                        {movie.programs.length > 0 && (
                          <div className="oscar-archive-broadcasts">
                            <button
                              type="button"
                              className="oscar-archive-broadcasts-toggle"
                              onClick={() => toggleMovieBroadcasts(index)}
                            >
                              {expandedMovies.has(index) ? '▾' : '▸'} {movie.programs.length} broadcast{movie.programs.length !== 1 ? 's' : ''}
                            </button>
                            {expandedMovies.has(index) && (
                              <div className="oscar-archive-broadcasts-list">
                                {movie.programs.map((p, pi) => (
                                  <div key={pi} className="oscar-archive-broadcast-row">
                                    {p.channel_icon ? (
                                      <img
                                        src={p.channel_icon}
                                        alt={p.channel_name}
                                        className="channel-icon"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <span className="channel">{p.channel_name}</span>
                                    )}
                                    <span className="separator">•</span>
                                    <span>{p.date}</span>
                                    <span className="separator">•</span>
                                    <span>{p.time}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="oscar-list-empty">
                  <span className="oscar-list-empty-icon">🔎</span>
                  No movies match your search.
                </div>
              )}
            </>
          ) : (
            <>
              {filteredChannels.length > 0 ? (
                <div className="oscar-archive-channels-list">
                  {filteredChannels.map(ch => (
                    <div key={ch.channel_name} className="oscar-archive-channel-card">
                      <div
                        className="oscar-archive-channel-header"
                        onClick={() => toggleChannel(ch.channel_name)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="oscar-archive-channel-info">
                          {ch.channel_icon ? (
                            <img
                              src={ch.channel_icon}
                              alt={ch.channel_name}
                              className="oscar-archive-channel-icon"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <span className="oscar-archive-channel-name">{ch.channel_name}</span>
                          )}
                          <span className="oscar-archive-channel-name">{ch.channel_name}</span>
                        </div>
                        <div className="oscar-archive-channel-stats">
                          <span className="oscar-scanner-stat-pill">{ch.total_movies} movies</span>
                          {ch.winners_count > 0 && (
                            <span className="oscar-scanner-stat-pill oscar-archive-stat-winner">
                              🏆 {ch.winners_count}
                            </span>
                          )}
                          {ch.nominees_count > 0 && (
                            <span className="oscar-scanner-stat-pill">
                              ⭐ {ch.nominees_count}
                            </span>
                          )}
                          <span className="oscar-archive-expand-icon">
                            {expandedChannels.has(ch.channel_name) ? '▾' : '▸'}
                          </span>
                        </div>
                      </div>
                      {expandedChannels.has(ch.channel_name) && (
                        <div className="oscar-archive-channel-titles">
                          {ch.winners.length > 0 && (
                            <div className="oscar-archive-title-group">
                              <div className="oscar-archive-title-group-label">🏆 Winners</div>
                              {ch.winners.map((t, i) => (
                                <div key={i} className="oscar-archive-title-row">{t}</div>
                              ))}
                            </div>
                          )}
                          {ch.nominees.length > 0 && (
                            <div className="oscar-archive-title-group">
                              <div className="oscar-archive-title-group-label">⭐ Nominees</div>
                              {ch.nominees.map((t, i) => (
                                <div key={i} className="oscar-archive-title-row">{t}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="oscar-list-empty">
                  <span className="oscar-list-empty-icon">🔎</span>
                  No channels match your search.
                </div>
              )}
            </>
          )}

          {summary && !loading && (
            <div className="oscar-list-footer">
              {activeView === 'movies'
                ? `Showing ${filteredMovies.length}${searchTerm.trim() ? ` of ${summary.unique_movies}` : ''} movies`
                : `Showing ${filteredChannels.length}${searchTerm.trim() ? ` of ${summary.channels.length}` : ''} channels`
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OscarArchiveDialog;
