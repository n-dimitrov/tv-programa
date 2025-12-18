import React, { useState, useEffect } from 'react';
import './ProgramsView.css';

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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [programs, setPrograms] = useState<DayPrograms | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dates, setDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoBaseUrl, setLogoBaseUrl] = useState<string>('');

  // Load config and get last 7 days
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/config');
        if (response.ok) {
          const data = await response.json();
          setLogoBaseUrl(data.logo_base_url || 'https://www.xn----8sbafg9clhjcp.bg');
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        setLogoBaseUrl('https://www.xn----8sbafg9clhjcp.bg'); // Fallback
      }
    };

    loadConfig();

    const today = new Date();
    const last7Days: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    setDates(last7Days);
    if (last7Days.length > 0) {
      setSelectedDate(last7Days[last7Days.length - 1]); // Default to today
    }
  }, []);

  // Load programs for selected date
  useEffect(() => {
    if (!selectedDate) return;

    const loadPrograms = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`http://localhost:8000/api/programs?date=${selectedDate}`);

        if (!response.ok) {
          throw new Error('No programs found for this date');
        }

        const data = await response.json();
        setPrograms(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load programs');
        setPrograms(null);
      } finally {
        setLoading(false);
      }
    };

    loadPrograms();
  }, [selectedDate]);

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="programs-view">
      <div className="date-tabs">
        {dates.map(date => (
          <button
            key={date}
            className={`date-tab ${selectedDate === date ? 'active' : ''}`}
            onClick={() => setSelectedDate(date)}
          >
            {formatDateDisplay(date)}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading programs...</div>}

      {error && <div className="error-message">{error}</div>}

      {programs && (
        <div className="programs-container">
          <div className="programs-header">
            <h2>Programs for {formatDateDisplay(selectedDate)}</h2>
            <div className="programs-meta">
              <span>{programs.metadata.channels_with_programs} channels</span>
              <span>
                {Object.values(programs.programs).reduce(
                  (sum, ch) => sum + ch.count,
                  0
                )} programs
              </span>
            </div>
          </div>

          <div className="channels-list">
            {Object.values(programs.programs).map(channelData => (
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
                  <span className="program-count">{channelData.count} programs</span>
                </div>

                <div className="programs-list">
                  {channelData.programs.map((program, idx) => (
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
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && !programs && (
        <div className="no-programs">
          <p>No programs found for {formatDateDisplay(selectedDate)}</p>
          <p>Select a different date or fetch programs using the API</p>
        </div>
      )}
    </div>
  );
}

export default ProgramsView;
