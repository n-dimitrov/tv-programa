import React, { useState, useEffect, useRef } from 'react';
import './ProgramsView.css';
import { API_URL } from '../config';

interface Program {
  time: string;
  title: string;
  description?: string;
  full?: string;
  oscar?: {
    winner: number;
    nominee: number;
    winner_categories: string[];
    nominee_categories: string[];
    title_en?: string;
    poster_path?: string;
    overview?: string;
  };
}

interface DayPrograms {
  metadata: {
    timestamp: string;
    date: string;
    total_channels: number;
    channels_with_programs: number;
  };
  programs: {
    [key: string]: {
      channel: {
        id: string;
        name: string;
        icon: string;
      };
      programs: Program[];
      count: number;
    };
  };
}

function ProgramsView() {
  const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [allPrograms, setAllPrograms] = useState<{ [date: string]: DayPrograms }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [dates, setDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoBaseUrl, setLogoBaseUrl] = useState<string>('');
  const [hiddenChannels, setHiddenChannels] = useState<Set<string>>(new Set());
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  type OscarFilterKey = 'oscar' | 'winners' | 'best-picture';
  const OSCAR_FILTERS: { key: OscarFilterKey; label: string }[] = [
    { key: 'oscar', label: 'Nomenees' },
    { key: 'winners', label: 'Oscars' },
    { key: 'best-picture', label: 'Best Pictures' }
  ];
  const [oscarFilterIndex, setOscarFilterIndex] = useState<number>(0);
  const [isOscarFilterActive, setIsOscarFilterActive] = useState<boolean>(false);
  const [oscarModalProgram, setOscarModalProgram] = useState<Program | null>(null);
  const [activePosterIndex, setActivePosterIndex] = useState<number>(0);
  const [lastInteractionTs, setLastInteractionTs] = useState<number>(Date.now());
  const [isPosterOverflowing, setIsPosterOverflowing] = useState<boolean>(true);
  const posterScrollRef = useRef<HTMLDivElement | null>(null);
  const carouselReadyRef = useRef<boolean>(false);

  // Load config, all 7 days of programs at once, and get last 7 days
  useEffect(() => {
    const loadConfigAndPrograms = async () => {
      try {
        // Load config
        const configResponse = await fetch(`${API_URL}/api/config`);
        if (configResponse.ok) {
          const data = await configResponse.json();
          setLogoBaseUrl(data.logo_base_url || 'https://www.xn----8sbafg9clhjcp.bg');
        } else {
          setLogoBaseUrl('https://www.xn----8sbafg9clhjcp.bg');
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        setLogoBaseUrl('https://www.xn----8sbafg9clhjcp.bg');
      }

      // Generate dates
      const today = new Date();
      const last7Days: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
      }

      setDates(last7Days);
      if (last7Days.length > 0) {
        setSelectedDates(last7Days); // Default to all 7 days
      }

      // Load all programs at once
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/programs/7days`);

        if (!response.ok) {
          throw new Error('No programs found');
        }

        const data = await response.json();
        setAllPrograms(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load programs');
        setAllPrograms({});
      } finally {
        setLoading(false);
      }
    };

    loadConfigAndPrograms();
  }, []);

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const sortProgramsByTimeDescending = (programs: Program[]): Program[] => {
    return [...programs].sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];
      return minutesB - minutesA; // Descending order
    });
  };

  const toggleDateFilter = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date].sort()
    );
  };

  const toggleChannel = (channelId: string) => {
    setHiddenChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  const isChannelHidden = (channelId: string): boolean => {
    return hiddenChannels.has(channelId);
  };

  const selectAllChannels = () => {
    setHiddenChannels(new Set());
  };

  const unselectAllChannels = () => {
    const allChannelIds = new Set(
      Object.values(getCombinedChannelPrograms()).map(ch => ch.channel.id)
    );
    setHiddenChannels(allChannelIds);
  };

  const hasDataForDate = (date: string): boolean => {
    return !!allPrograms[date];
  };

  const filterProgramsBySearch = (programs: Program[]): Program[] => {
    if (!searchTerm.trim()) return programs;
    const searchLower = searchTerm.toLowerCase();
    return programs.filter(program =>
      program.title.toLowerCase().includes(searchLower) ||
      (program.description && program.description.toLowerCase().includes(searchLower))
    );
  };

  const matchesOscarFilter = (program: Program, filterKey: OscarFilterKey): boolean => {
    if (!program.oscar) return false;

    if (filterKey === 'oscar') return true;
    if (filterKey === 'winners') return program.oscar.winner > 0;
    if (filterKey === 'best-picture') {
      return program.oscar.winner_categories.includes('Best Picture');
    }
    return true;
  };

  const filterPrograms = (programs: Program[]): Program[] => {
    let filtered = filterProgramsBySearch(programs);
    if (isOscarFilterActive) {
      const effectiveFilter = OSCAR_FILTERS[oscarFilterIndex].key;
      filtered = filtered.filter(program => matchesOscarFilter(program, effectiveFilter));
    }
    return filtered;
  };

  const countOscarPrograms = (filterKey: OscarFilterKey): number => {
    const seen = new Set<string>();
    const sortedDates = [...selectedDates].sort().reverse();
    sortedDates.forEach(date => {
      if (!allPrograms[date]) return;
      Object.values(allPrograms[date].programs).forEach(channelData => {
        const filtered = filterProgramsBySearch(channelData.programs);
        filtered.forEach(program => {
          if (!matchesOscarFilter(program, filterKey) || !program.oscar) return;
          const key = program.oscar.title_en || program.title;
          if (seen.has(key)) return;
          seen.add(key);
        });
      });
    });
    return seen.size;
  };

  const getOscarPosterPrograms = (): Program[] => {
    const seen = new Set<string>();
    const posters: Program[] = [];
    const sortedDates = [...selectedDates].sort().reverse();
    const posterFilter = OSCAR_FILTERS[oscarFilterIndex].key;
    sortedDates.forEach(date => {
      if (!allPrograms[date]) return;
      Object.values(allPrograms[date].programs).forEach(channelData => {
        channelData.programs.forEach(program => {
          if (!program.oscar?.poster_path) return;
          if (!matchesOscarFilter(program, posterFilter)) return;
          const key = program.oscar.title_en || program.title;
          if (seen.has(key)) return;
          seen.add(key);
          posters.push(program);
        });
      });
    });
    return posters;
  };

  const getCombinedChannelPrograms = () => {
    const combinedData: { [channelId: string]: { channel: any; programs: { date: string; programs: Program[] }[] } } = {};

    // Sort selected dates in descending order (most recent first)
    const sortedDates = [...selectedDates].sort().reverse();

    sortedDates.forEach(date => {
      if (allPrograms[date]) {
        Object.entries(allPrograms[date].programs).forEach(([channelId, channelData]) => {
          if (!combinedData[channelId]) {
            combinedData[channelId] = {
              channel: channelData.channel,
              programs: []
            };
          }
          const filteredPrograms = filterPrograms(channelData.programs);
          if (filteredPrograms.length > 0) {
            combinedData[channelId].programs.push({
              date: date,
              programs: filteredPrograms
            });
          }
        });
      }
    });

    // Remove channels with no programs after search filtering
    return Object.entries(combinedData)
      .filter(([_, channelData]) => channelData.programs.length > 0)
      .reduce((acc, [channelId, channelData]) => {
        acc[channelId] = channelData;
        return acc;
      }, {} as typeof combinedData);
  };

  const oscarPosters = getOscarPosterPrograms();
  const cloneCount = isPosterOverflowing ? Math.min(4, oscarPosters.length) : 0;
  const prefixClones = cloneCount ? oscarPosters.slice(-cloneCount) : [];
  const suffixClones = cloneCount ? oscarPosters.slice(0, cloneCount) : [];
  const oscarPostersWithClones = [
    ...prefixClones,
    ...oscarPosters,
    ...suffixClones
  ].map((program, index) => ({
    program,
    displayIndex: index
  }));
  const getRealIndex = (displayIndex: number): number => {
    if (!oscarPosters.length) return 0;
    if (displayIndex < cloneCount) {
      return oscarPosters.length - cloneCount + displayIndex;
    }
    if (displayIndex >= cloneCount + oscarPosters.length) {
      return displayIndex - (cloneCount + oscarPosters.length);
    }
    return displayIndex - cloneCount;
  };
  const activePosterMeta = oscarPostersWithClones[activePosterIndex];
  const activePoster = activePosterMeta
    ? oscarPosters[getRealIndex(activePosterMeta.displayIndex)]
    : undefined;

  useEffect(() => {
    if (!oscarPosters.length) return;
    setLastInteractionTs(Date.now());
    carouselReadyRef.current = false;

    if (!isPosterOverflowing) {
      setActivePosterIndex(0);
      return;
    }

    const startIndex = cloneCount;
    setActivePosterIndex(startIndex);

    requestAnimationFrame(() => {
      const container = posterScrollRef.current;
      const poster = container?.querySelector<HTMLElement>(
        `[data-poster-index="${startIndex}"]`
      );
      if (!container || !poster) return;
      const targetScrollLeft = poster.offsetLeft - (container.clientWidth - poster.clientWidth) / 2;
      container.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      carouselReadyRef.current = true;
    });
  }, [cloneCount, isPosterOverflowing, oscarPosters.length]);

  useEffect(() => {
    const container = posterScrollRef.current;
    if (!container || !oscarPosters.length) return;

    const updateEdgePadding = () => {
      const posterImg = container.querySelector<HTMLImageElement>('img');
      if (!posterImg) return;
      const posterWidth = posterImg.getBoundingClientRect().width;
      const styles = window.getComputedStyle(container);
      const gap = parseFloat(styles.columnGap || styles.gap || '12');
      const totalWidth = posterWidth * oscarPosters.length + gap * Math.max(0, oscarPosters.length - 1);
      const overflow = totalWidth > container.clientWidth + 1;
      setIsPosterOverflowing(overflow);
      if (!overflow) {
        container.style.setProperty('--oscar-edge-pad', '0px');
        container.scrollTo({ left: 0, behavior: 'auto' });
        return;
      }
      const halfSpace = container.clientWidth / 2 - posterWidth / 2;
      const step = posterWidth + gap;
      const leftCount = Math.floor(halfSpace / step);
      const remainder = halfSpace - leftCount * step;
      const pad = Math.max(0, remainder - posterWidth / 2);
      container.style.setProperty('--oscar-edge-pad', `${pad}px`);
    };

    updateEdgePadding();
    window.addEventListener('resize', updateEdgePadding);
    return () => window.removeEventListener('resize', updateEdgePadding);
  }, [oscarPosters.length]);

  useEffect(() => {
    if (!oscarPostersWithClones.length) return;
    const interval = setInterval(() => {
      if (Date.now() - lastInteractionTs < 10000) return;
      setActivePosterIndex(prev => (prev + 1) % oscarPostersWithClones.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [oscarPostersWithClones.length, lastInteractionTs]);

  useEffect(() => {
    if (!posterScrollRef.current) return;
    if (!carouselReadyRef.current) return;
    if (!isPosterOverflowing) return;
    const poster = posterScrollRef.current.querySelector<HTMLElement>(
      `[data-poster-index="${activePosterIndex}"]`
    );
    if (poster) {
      const container = posterScrollRef.current;
      const containerWidth = container.clientWidth;
      const targetScrollLeft = poster.offsetLeft - (containerWidth - poster.clientWidth) / 2;
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      const lastOriginalIndex = cloneCount + oscarPosters.length - 1;
      if (activePosterIndex > lastOriginalIndex && oscarPosters.length) {
        const realIndex = activePosterIndex - (cloneCount + oscarPosters.length);
        const realDisplayIndex = cloneCount + realIndex;
        const realPoster = container.querySelector<HTMLElement>(
          `[data-poster-index="${realDisplayIndex}"]`
        );
        if (realPoster) {
          const realTargetScrollLeft =
            realPoster.offsetLeft - (containerWidth - realPoster.clientWidth) / 2;
          window.setTimeout(() => {
            container.scrollTo({ left: realTargetScrollLeft, behavior: 'auto' });
            setActivePosterIndex(realDisplayIndex);
          }, 350);
        }
      }
      if (activePosterIndex < cloneCount && oscarPosters.length) {
        const realIndex = oscarPosters.length - cloneCount + activePosterIndex;
        const realDisplayIndex = cloneCount + realIndex;
        const realPoster = container.querySelector<HTMLElement>(
          `[data-poster-index="${realDisplayIndex}"]`
        );
        if (realPoster) {
          const realTargetScrollLeft =
            realPoster.offsetLeft - (containerWidth - realPoster.clientWidth) / 2;
          window.setTimeout(() => {
            container.scrollTo({ left: realTargetScrollLeft, behavior: 'auto' });
            setActivePosterIndex(realDisplayIndex);
          }, 350);
        }
      }
    }
  }, [activePosterIndex, cloneCount, isPosterOverflowing, oscarPosters.length]);

  return (
    <div className="programs-view">
      {oscarPosters.length > 0 && (
        <div
          className="oscar-strip"
          onMouseEnter={() => setLastInteractionTs(Date.now())}
          onTouchStart={() => setLastInteractionTs(Date.now())}
        >
          <div className="oscar-strip-header">
            <h3>Oscar Picks</h3>
            <div className="oscar-switch" role="group" aria-label="Oscar filter">
              <button
                type="button"
                className="oscar-switch-arrow"
                onClick={() =>
                  setOscarFilterIndex(prev => (prev - 1 + OSCAR_FILTERS.length) % OSCAR_FILTERS.length)
                }
                aria-label="Previous Oscar filter"
              >
                {'<'}
              </button>
              <button
                type="button"
                className={`oscar-pill ${isOscarFilterActive ? 'active' : 'inactive'}`}
                onClick={() => setIsOscarFilterActive(prev => !prev)}
                aria-pressed={isOscarFilterActive}
              >
                {OSCAR_FILTERS[oscarFilterIndex].label}
                <span className="oscar-pill-count">
                  ({countOscarPrograms(OSCAR_FILTERS[oscarFilterIndex].key)})
                </span>
              </button>
              <button
                type="button"
                className="oscar-switch-arrow"
                onClick={() =>
                  setOscarFilterIndex(prev => (prev + 1) % OSCAR_FILTERS.length)
                }
                aria-label="Next Oscar filter"
              >
                {'>'}
              </button>
            </div>
          </div>
          <div
            className={`oscar-strip-scroll ${!isPosterOverflowing ? 'compact' : ''}`}
            ref={posterScrollRef}
          >
            {oscarPostersWithClones.map((posterMeta) => (
              <button
                key={`${posterMeta.displayIndex}-${posterMeta.program.oscar?.title_en || posterMeta.program.title}`}
                className={`oscar-poster-card ${
                  posterMeta.displayIndex === activePosterIndex ? 'active' : ''
                }`}
                type="button"
                data-poster-index={posterMeta.displayIndex}
                onClick={() => {
                  const isSamePoster = posterMeta.displayIndex === activePosterIndex;
                  const isSameSearch = searchTerm.trim().toLowerCase() === posterMeta.program.title.toLowerCase();
                  if (isSamePoster && isSameSearch) {
                    setSearchTerm('');
                  } else {
                    setSearchTerm(posterMeta.program.title);
                    setActivePosterIndex(posterMeta.displayIndex);
                  }
                  setLastInteractionTs(Date.now());
                }}
                aria-label={`Search for ${posterMeta.program.title}`}
              >
                <img
                  src={`${TMDB_POSTER_BASE_URL}${posterMeta.program.oscar?.poster_path}`}
                  alt={posterMeta.program.oscar?.title_en || posterMeta.program.title}
                />
              </button>
            ))}
          </div>
          {activePoster?.oscar && (
            <div className="oscar-strip-info">
              <div className="oscar-strip-title">
                <span>{activePoster.title}</span>
                {activePoster.oscar.title_en && (
                  <span className="oscar-strip-title-en">{activePoster.oscar.title_en}</span>
                )}
              </div>
              <div className="oscar-strip-badges">
                <span
                  className={`oscar-badge ${
                    activePoster.oscar.winner ? 'oscar-badge-winner' : 'oscar-badge-nominee'
                  }`}
                >
                  Oscar {activePoster.oscar.winner}W / {activePoster.oscar.nominee}N
                </span>
                {(activePoster.oscar.winner_categories.includes('Best Picture') ||
                  activePoster.oscar.nominee_categories.includes('Best Picture')) && (
                  <span
                    className={`oscar-badge oscar-badge-star ${
                      activePoster.oscar.winner_categories.includes('Best Picture')
                        ? 'oscar-badge-winner'
                        : 'oscar-badge-nominee'
                    }`}
                  >
                    ★
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search programs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="filter-container">
        <div className="filter-section">
          <button
            className="filter-header"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          >
            <span className={`expand-icon ${isFiltersExpanded ? 'expanded' : ''}`}>▼</span>
            <h3>Filters</h3>
          </button>
          {isFiltersExpanded && (
            <div className="filter-content">
              {/* Date Filter */}
              <div className="filter-group">
                <h4>Filter by Date</h4>
                <div className="date-tabs">
                  {dates.map(date => (
                    <button
                      key={date}
                      className={`date-tab ${selectedDates.includes(date) ? 'active' : ''} ${!hasDataForDate(date) ? 'no-data' : ''}`}
                      onClick={() => toggleDateFilter(date)}
                      disabled={!hasDataForDate(date)}
                    >
                      {formatDateDisplay(date)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Selection */}
              {selectedDates.length > 0 && (
                <div className="filter-group">
                  <h4>Select Channels</h4>
                  <div className="channel-selector">
                    <div className="selector-controls">
                      <button className="select-all-btn" onClick={selectAllChannels}>
                        Select All
                      </button>
                      <button className="unselect-all-btn" onClick={unselectAllChannels}>
                        Unselect All
                      </button>
                    </div>
                    {Object.values(getCombinedChannelPrograms()).map(channelData => (
                      <button
                        key={channelData.channel.id}
                        className={`channel-toggle-btn ${isChannelHidden(channelData.channel.id) ? 'hidden' : 'visible'}`}
                        onClick={() => toggleChannel(channelData.channel.id)}
                        title={channelData.channel.name}
                      >
                        {channelData.channel.icon && (
                          <img
                            src={`${logoBaseUrl}${channelData.channel.icon}`}
                            alt={channelData.channel.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {loading && <div className="loading">Loading programs for all 7 days...</div>}

      {error && <div className="error-message">{error}</div>}

      {selectedDates.length > 0 && (
        <div className="programs-container">

          <div className="channels-list">
            {Object.values(getCombinedChannelPrograms())
              .filter(ch => !isChannelHidden(ch.channel.id))
              .map(channelData => (
              <div key={channelData.channel.id} className="channel-card">
                <div className="channel-header">
                  {channelData.channel.icon && (
                    <img
                      src={`${logoBaseUrl}${channelData.channel.icon}`}
                      alt={channelData.channel.name}
                      className="channel-icon"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <h3>{channelData.channel.name}</h3>
                  <span className="program-count">
                    {channelData.programs.reduce((cnt, dp) => cnt + dp.programs.length, 0)} programs
                  </span>
                </div>

                <div className="programs-list">
                  {channelData.programs.map((datePrograms, dateIdx) => (
                    <div key={dateIdx}>
                      <div className="date-section-header">
                        <span>{formatDateDisplay(datePrograms.date)}</span>
                      </div>
                      {sortProgramsByTimeDescending(datePrograms.programs).map((program, idx) => (
                        <div key={idx} className="program-item">
                          <div
                            className={`program-time ${
                              program.oscar?.winner
                                ? 'program-time-oscar'
                                : program.oscar?.nominee
                                  ? 'program-time-oscar-nominee'
                                  : ''
                            }`}
                          >
                            {program.time}
                          </div>
                          <div className="program-details">
                            <div className="program-title">
                              {program.title}
                              {program.oscar && (
                                <>
                                  <button
                                    type="button"
                                    className={`oscar-badge ${
                                      program.oscar.winner ? 'oscar-badge-winner' : 'oscar-badge-nominee'
                                    }`}
                                    onClick={() => setOscarModalProgram(program)}
                                    aria-label={`View Oscar details for ${program.title}`}
                                  >
                                    Oscar {program.oscar.winner}W / {program.oscar.nominee}N
                                  </button>
                                  {(program.oscar.winner_categories.includes('Best Picture') ||
                                    program.oscar.nominee_categories.includes('Best Picture')) && (
                                    <span
                                      className={`oscar-badge oscar-badge-star ${
                                        program.oscar.winner_categories.includes('Best Picture')
                                          ? 'oscar-badge-winner'
                                          : 'oscar-badge-nominee'
                                      }`}
                                    >
                                      ★
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {program.oscar?.title_en && (
                              <div className="program-subtitle">{program.oscar.title_en}</div>
                            )}
                            {program.description && (
                              <div className="program-description">{program.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && selectedDates.length === 0 && (
        <div className="no-programs">
          <p>Select one or more dates to view programs</p>
        </div>
      )}

      {oscarModalProgram?.oscar && (
        <div
          className="oscar-modal-overlay"
          onClick={() => setOscarModalProgram(null)}
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
              onClick={() => setOscarModalProgram(null)}
              aria-label="Close Oscar details"
            >
              Close
            </button>
            <div className="oscar-modal-content">
              {oscarModalProgram.oscar.poster_path && (
                <img
                  className="oscar-poster"
                  src={`${TMDB_POSTER_BASE_URL}${oscarModalProgram.oscar.poster_path}`}
                  alt={oscarModalProgram.oscar.title_en || oscarModalProgram.title}
                />
              )}
              <div className="oscar-details">
                <h3>{oscarModalProgram.title}</h3>
                {oscarModalProgram.oscar.title_en && (
                  <div className="oscar-title-en">{oscarModalProgram.oscar.title_en}</div>
                )}
                {oscarModalProgram.oscar.overview && (
                  <p className="oscar-overview">{oscarModalProgram.oscar.overview}</p>
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
                      const isWinner = oscarModalProgram.oscar?.winner_categories.includes(category);
                      const isNominee = oscarModalProgram.oscar?.nominee_categories.includes(category);
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
}

export default ProgramsView;
