import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    year?: number;
    poster_path?: string;
    overview?: string;
    watch?: {
      region?: string;
      link?: string;
      flatrate?: WatchProvider[];
      rent?: WatchProvider[];
      buy?: WatchProvider[];
    };
  };
}

interface WatchProvider {
  logo_path?: string;
  provider_id?: number;
  provider_name?: string;
  display_priority?: number;
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

type OscarFilterKey = 'oscar' | 'winners' | 'best-picture';

const OSCAR_FILTERS: { key: OscarFilterKey; label: string }[] = [
  { key: 'oscar', label: 'Номиниран' },
  { key: 'winners', label: 'Oscar' },
  { key: 'best-picture', label: 'Best Picture ★' }
];

function ProgramsView() {
  const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';
  const TMDB_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w45';
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [allPrograms, setAllPrograms] = useState<{ [date: string]: DayPrograms }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [dates, setDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoBaseUrl, setLogoBaseUrl] = useState<string>('');
  const [hiddenChannels, setHiddenChannels] = useState<Set<string>>(new Set());
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [oscarFilterIndex, setOscarFilterIndex] = useState<number>(0);
  const [isOscarFilterActive, setIsOscarFilterActive] = useState<boolean>(false);
  const [oscarModalProgram, setOscarModalProgram] = useState<Program | null>(null);
  const [isWatchExpanded, setIsWatchExpanded] = useState<boolean>(false);
  const [activePosterIndex, setActivePosterIndex] = useState<number>(0);
  const [lastInteractionTs, setLastInteractionTs] = useState<number>(Date.now());
  const [isPosterOverflowing, setIsPosterOverflowing] = useState<boolean>(true);
  const posterScrollRef = useRef<HTMLDivElement | null>(null);
  const prevPosterIndexRef = useRef<number>(0);
  const channelListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dateSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dateFirstProgramRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRafByChannelRef = useRef<Record<string, number>>({});
  const dateCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevExpandedChannelsRef = useRef<Set<string> | null>(null);
  const [activeDateByChannel, setActiveDateByChannel] = useState<Record<string, string>>({});

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
          throw new Error('Не са намерени предавания');
        }

        const data = await response.json();
        setAllPrograms(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неуспешно зареждане на програмата');
        setAllPrograms({});
      } finally {
        setLoading(false);
      }
    };

    loadConfigAndPrograms();
  }, []);

  const formatDateDisplay = (dateStr: string, uppercase = false): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const monthNames = ['Ян', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек'];
    const weekdayNames = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const weekday = weekdayNames[date.getDay()];
    const label = `${day} ${month}, ${weekday}`;
    return uppercase ? label.toUpperCase() : label;
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

  const toggleChannelExpanded = (channelId: string) => {
    setExpandedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  const scrollToChannelDate = (channelId: string, date: string) => {
    const container = channelListRefs.current[channelId];
    const target =
      dateFirstProgramRefs.current[`${channelId}-${date}`] ||
      dateSectionRefs.current[`${channelId}-${date}`];
    if (!container || !target) return;
    const header = dateSectionRefs.current[`${channelId}-${date}`];
    const headerHeight = header?.offsetHeight ?? 0;
    setActiveDateByChannel(prev => ({ ...prev, [channelId]: date }));
    ensureDateCarouselVisible(channelId, date);
    const top = Math.max(0, target.offsetTop - container.offsetTop - headerHeight);
    container.scrollTo({ top, behavior: 'smooth' });
  };

  const ensureDateCarouselVisible = (channelId: string, date: string) => {
    const carousel = dateCarouselRefs.current[channelId];
    if (!carousel) return;
    const button = carousel.querySelector<HTMLElement>(`[data-date-carousel="${date}"]`);
    if (!button) return;
    if (typeof button.scrollIntoView === 'function') {
      button.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      return;
    }
    const left = button.offsetLeft;
    const right = left + button.offsetWidth;
    const viewLeft = carousel.scrollLeft;
    const viewRight = viewLeft + carousel.clientWidth;
    const padding = 8;
    if (left - padding < viewLeft) {
      carousel.scrollTo({ left: Math.max(0, left - padding), behavior: 'smooth' });
    } else if (right + padding > viewRight) {
      carousel.scrollTo({ left: right - carousel.clientWidth + padding, behavior: 'smooth' });
    }
  };

  const handleChannelScroll = (channelId: string) => {
    const container = channelListRefs.current[channelId];
    if (!container) return;
    if (scrollRafByChannelRef.current[channelId]) return;
    scrollRafByChannelRef.current[channelId] = window.requestAnimationFrame(() => {
      scrollRafByChannelRef.current[channelId] = 0;
      const headers = Array.from(
        container.querySelectorAll<HTMLElement>('[data-date-section="true"]')
      );
      if (!headers.length) return;
      const containerTop = container.scrollTop;
      let currentDate = headers[0].dataset.date || '';
      for (const header of headers) {
        const offset = header.offsetTop - container.offsetTop;
        if (offset - 4 <= containerTop + header.offsetHeight) {
          currentDate = header.dataset.date || currentDate;
        } else {
          break;
        }
      }
      setActiveDateByChannel(prev => {
        if (prev[channelId] === currentDate) return prev;
        ensureDateCarouselVisible(channelId, currentDate);
        return { ...prev, [channelId]: currentDate };
      });
    });
  };

  const isChannelHidden = (channelId: string): boolean => {
    return hiddenChannels.has(channelId);
  };

  const isChannelExpanded = (channelId: string): boolean => {
    return expandedChannels.has(channelId);
  };

  const selectAllChannels = () => {
    setHiddenChannels(new Set());
  };

  const unselectAllChannels = () => {
    const allChannelIds = new Set(
      Object.values(combinedChannelPrograms).map(ch => ch.channel.id)
    );
    setHiddenChannels(allChannelIds);
  };

  const hasDataForDate = (date: string): boolean => {
    return !!allPrograms[date];
  };

  const filterProgramsBySearch = useCallback((programs: Program[]): Program[] => {
    if (!searchTerm.trim()) return programs;
    const searchLower = searchTerm.toLowerCase();
    return programs.filter(program =>
      program.title.toLowerCase().includes(searchLower) ||
      (program.description && program.description.toLowerCase().includes(searchLower))
    );
  }, [searchTerm]);

  const matchesOscarFilter = useCallback((program: Program, filterKey: OscarFilterKey): boolean => {
    if (!program.oscar) return false;

    if (filterKey === 'oscar') return true;
    if (filterKey === 'winners') return program.oscar.winner > 0;
    if (filterKey === 'best-picture') {
      return program.oscar.winner_categories.includes('Best Picture');
    }
    return true;
  }, []);

  const filterPrograms = useCallback((programs: Program[]): Program[] => {
    let filtered = filterProgramsBySearch(programs);
    if (isOscarFilterActive) {
      const effectiveFilter = OSCAR_FILTERS[oscarFilterIndex].key;
      filtered = filtered.filter(program => matchesOscarFilter(program, effectiveFilter));
    }
    return filtered;
  }, [filterProgramsBySearch, isOscarFilterActive, oscarFilterIndex, matchesOscarFilter]);

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

  const combinedChannelPrograms = useMemo(
    () => {
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
    },
    [allPrograms, selectedDates, filterPrograms]
  );
  const oscarPosters = getOscarPosterPrograms();
  const activePoster = oscarPosters[activePosterIndex];

  useEffect(() => {
    if (!oscarPosters.length) {
      setActivePosterIndex(0);
      prevPosterIndexRef.current = 0;
      return;
    }
    setLastInteractionTs(Date.now());
    setActivePosterIndex(0);
    prevPosterIndexRef.current = 0;
    requestAnimationFrame(() => {
      posterScrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
    });
  }, [oscarPosters.length]);

  useEffect(() => {
    const container = posterScrollRef.current;
    if (!container || !oscarPosters.length) return;

    const updateOverflow = () => {
      const overflow = container.scrollWidth - container.clientWidth > 8;
      setIsPosterOverflowing(overflow);
      if (!overflow) {
        container.scrollTo({ left: 0, behavior: 'auto' });
      }
    };

    updateOverflow();
    window.addEventListener('resize', updateOverflow);
    return () => window.removeEventListener('resize', updateOverflow);
  }, [oscarPosters.length]);

  useEffect(() => {
    if (!oscarPosters.length) return;
    const interval = setInterval(() => {
      if (Date.now() - lastInteractionTs < 10000) return;
      setActivePosterIndex(prev => (prev + 1) % oscarPosters.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastInteractionTs, oscarPosters.length]);

  useEffect(() => {
    if (!posterScrollRef.current) return;
    if (!isPosterOverflowing) return;
    const poster = posterScrollRef.current.querySelector<HTMLElement>(
      `[data-poster-index="${activePosterIndex}"]`
    );
    if (poster) {
      const container = posterScrollRef.current;
      const styles = window.getComputedStyle(container);
      const paddingLeft = parseFloat(styles.paddingLeft || '0');
      const didWrapToStart =
        prevPosterIndexRef.current === oscarPosters.length - 1 && activePosterIndex === 0;
      if (didWrapToStart) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const posterLeft = poster.offsetLeft;
        const posterRight = posterLeft + poster.clientWidth;
        const containerLeft = container.scrollLeft;
        const containerRight = containerLeft + container.clientWidth;
        if (posterRight > containerRight) {
          const targetLeft = posterRight - container.clientWidth + paddingLeft;
          container.scrollTo({ left: targetLeft, behavior: 'smooth' });
        } else if (posterLeft < containerLeft + paddingLeft) {
          container.scrollTo({ left: posterLeft - paddingLeft, behavior: 'smooth' });
        }
      }
    }
    prevPosterIndexRef.current = activePosterIndex;
  }, [activePosterIndex, isPosterOverflowing, oscarPosters.length]);

  useEffect(() => {
    setIsWatchExpanded(false);
  }, [oscarModalProgram]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    const shouldExpand = !!trimmed || isOscarFilterActive;
    if (shouldExpand) {
      if (!prevExpandedChannelsRef.current) {
        prevExpandedChannelsRef.current = new Set(expandedChannels);
      }
      const channelIds = Object.values(combinedChannelPrograms).map(ch => ch.channel.id);
      const isFullyExpanded =
        expandedChannels.size === channelIds.length &&
        channelIds.every(id => expandedChannels.has(id));
      if (!isFullyExpanded) {
        setExpandedChannels(new Set(channelIds));
      }
      return;
    }
    if (prevExpandedChannelsRef.current) {
      setExpandedChannels(new Set(prevExpandedChannelsRef.current));
      prevExpandedChannelsRef.current = null;
    }
  }, [searchTerm, isOscarFilterActive, combinedChannelPrograms, expandedChannels]);

  return (
    <div className="programs-view">
      {oscarPosters.length > 0 && (
        <div
          className="oscar-strip"
          onMouseEnter={() => setLastInteractionTs(Date.now())}
          onTouchStart={() => setLastInteractionTs(Date.now())}
        >
          <div className="oscar-strip-header">
            <h3>OSCAR Подбор</h3>
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
            {oscarPosters.map((poster, index) => (
              <button
                key={`${index}-${poster.oscar?.title_en || poster.title}`}
                className={`oscar-poster-card ${
                  index === activePosterIndex ? 'active' : ''
                }`}
                type="button"
                data-poster-index={index}
                onClick={() => {
                  const isSamePoster = index === activePosterIndex;
                  const isSameSearch = searchTerm.trim().toLowerCase() === poster.title.toLowerCase();
                  if (isSamePoster && isSameSearch) {
                    setSearchTerm('');
                  } else {
                    setSearchTerm(poster.title);
                    setActivePosterIndex(index);
                  }
                  setLastInteractionTs(Date.now());
                }}
                aria-label={`Search for ${poster.title}`}
              >
                <img
                  src={`${TMDB_POSTER_BASE_URL}${poster.oscar?.poster_path}`}
                  alt={poster.oscar?.title_en || poster.title}
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
          placeholder="Търсене на предавания..."
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
            <h3>Филтри</h3>
          </button>
          {isFiltersExpanded && (
            <div className="filter-content">
              {/* Date Filter */}
              <div className="filter-group">
                <h4>Филтър по дата</h4>
                <div className="date-tabs">
                  {[...dates].reverse().map((date, index) => {
                    const isToday = index === 0;
                    return (
                      <button
                        key={date}
                        className={`date-tab ${selectedDates.includes(date) ? 'active' : ''} ${!hasDataForDate(date) ? 'no-data' : ''} ${isToday ? 'today' : ''}`}
                        onClick={() => toggleDateFilter(date)}
                        disabled={!hasDataForDate(date)}
                      >
                        {formatDateDisplay(date, true)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channel Selection */}
              {selectedDates.length > 0 && (
                <div className="filter-group">
                  <h4>Избор на канали</h4>
                  <div className="channel-selector">
                    <div className="selector-controls">
                      <button className="select-all-btn" onClick={selectAllChannels}>
                        Избери всички
                      </button>
                      <button className="unselect-all-btn" onClick={unselectAllChannels}>
                        Премахни всички
                      </button>
                    </div>
                    {Object.values(combinedChannelPrograms).map(channelData => (
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

      {loading && <div className="loading">Зареждане на програмата за 7 дни...</div>}

      {error && <div className="error-message">{error}</div>}

      {selectedDates.length > 0 && (
        <div className="programs-container">

          <div className="channels-list">
            {Object.values(combinedChannelPrograms)
              .filter(ch => !isChannelHidden(ch.channel.id))
              .map(channelData => (
              <div key={channelData.channel.id} className="channel-card">
                <div className="channel-header">
                  <div className="channel-header-left" onClick={() => toggleChannelExpanded(channelData.channel.id)}>
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
                      {channelData.programs.reduce((cnt, dp) => cnt + dp.programs.length, 0)}
                    </span>
                  </div>
                  <button
                    className="channel-expand-btn"
                    onClick={() => toggleChannelExpanded(channelData.channel.id)}
                    aria-label={isChannelExpanded(channelData.channel.id) ? "Collapse" : "Expand"}
                  >
                    <span className={`expand-icon ${isChannelExpanded(channelData.channel.id) ? 'expanded' : ''}`}>▼</span>
                  </button>
                </div>

                {isChannelExpanded(channelData.channel.id) && (
                  <>
                  {channelData.programs.length > 1 && (
                    <div
                      className="date-carousel-header"
                      role="tablist"
                      aria-label="Jump to day"
                      ref={(el) => {
                        dateCarouselRefs.current[channelData.channel.id] = el;
                      }}
                    >
                      {channelData.programs.map(datePrograms => {
                        const activeDate =
                          activeDateByChannel[channelData.channel.id] ?? channelData.programs[0].date;
                        const isActive = activeDate === datePrograms.date;
                        return (
                          <button
                            key={`${channelData.channel.id}-${datePrograms.date}-jump`}
                            type="button"
                            className={`date-carousel-btn ${isActive ? 'active' : ''}`}
                            onClick={() => scrollToChannelDate(channelData.channel.id, datePrograms.date)}
                            aria-pressed={isActive}
                            title={formatDateDisplay(datePrograms.date)}
                            data-date-carousel={datePrograms.date}
                          >
                            {formatDateDisplay(datePrograms.date, true)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div
                    className="programs-list"
                    ref={(el) => {
                      channelListRefs.current[channelData.channel.id] = el;
                    }}
                    onScroll={() => handleChannelScroll(channelData.channel.id)}
                  >
                  {channelData.programs.map((datePrograms, dateIdx) => (
                    <div key={dateIdx}>
                      <div
                        className="date-section-header"
                        ref={(el) => {
                          dateSectionRefs.current[`${channelData.channel.id}-${datePrograms.date}`] = el;
                        }}
                        data-date-section="true"
                        data-date={datePrograms.date}
                      >
                        <span>{formatDateDisplay(datePrograms.date)}</span>
                      </div>
                      {sortProgramsByTimeDescending(datePrograms.programs).map((program, idx) => (
                        <div
                          key={idx}
                          className="program-item"
                          ref={(el) => {
                            if (idx === 0) {
                              dateFirstProgramRefs.current[`${channelData.channel.id}-${datePrograms.date}`] = el;
                            }
                          }}
                        >
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
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && selectedDates.length === 0 && (
        <div className="no-programs">
          <p>Изберете една или повече дати за преглед на програмата</p>
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
              ×
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
                  <div className="oscar-title-en">
                    {oscarModalProgram.oscar.title_en}
                    {oscarModalProgram.oscar.year && ` (${oscarModalProgram.oscar.year})`}
                  </div>
                )}
                {oscarModalProgram.oscar.overview && (
                  <p className="oscar-overview">{oscarModalProgram.oscar.overview}</p>
                )}
                {oscarModalProgram.oscar.watch && (
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
                          const providers = oscarModalProgram.oscar?.watch?.[tier] || [];
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
