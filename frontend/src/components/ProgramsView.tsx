import React, { useState, useEffect } from 'react';
import './ProgramsView.css';
import { API_URL } from '../config';

interface Program {
  time: string;
  title: string;
  description?: string;
  full?: string;
}

interface ChannelData {
  channel_id: string;
  channel_name: string;
  icon: string;
  programs: Program[];
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
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [allPrograms, setAllPrograms] = useState<{ [date: string]: DayPrograms }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [dates, setDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoBaseUrl, setLogoBaseUrl] = useState<string>('');
  const [hiddenChannels, setHiddenChannels] = useState<Set<string>>(new Set());
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

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
          const filteredPrograms = filterProgramsBySearch(channelData.programs);
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

  return (
    <div className="programs-view">
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
                          <div className="program-time">{program.time}</div>
                          <div className="program-details">
                            <div className="program-title">{program.title}</div>
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
    </div>
  );
}

export default ProgramsView;
