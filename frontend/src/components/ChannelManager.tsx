import React, { useState, useEffect } from 'react';
import './ChannelManager.css';
import { API_URL } from '../config';

interface Channel {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [logoBaseUrl, setLogoBaseUrl] = useState<string>('');

  // Load config and channels
  useEffect(() => {
    loadConfig();
    loadChannels();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config`);
      if (response.ok) {
        const data = await response.json();
        setLogoBaseUrl(data.logo_base_url || 'https://www.xn----8sbafg9clhjcp.bg');
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      setLogoBaseUrl('https://www.xn----8sbafg9clhjcp.bg'); // Fallback
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/channels`);

      if (!response.ok) {
        throw new Error('Failed to load channels');
      }

      const data = await response.json();
      setChannels(data.channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = async (channelId: string) => {
    const updatedChannels = channels.map(ch =>
      ch.id === channelId ? { ...ch, active: !ch.active } : ch
    );
    setChannels(updatedChannels);

    try {
      const response = await fetch(`${API_URL}/api/channels/${channelId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update channel');
      }

      const result = await response.json();
      console.log('Channel updated:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update channel');
      // Revert the change
      const reverted = channels.map(ch =>
        ch.id === channelId ? { ...ch, active: !ch.active } : ch
      );
      setChannels(reverted);
    }
  };

  const saveAllChannels = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/channels`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channels })
      });

      if (!response.ok) {
        throw new Error('Failed to save channels');
      }

      const result = await response.json();
      console.log('Channels saved:', result);
      alert('Channels saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channels');
    } finally {
      setSaving(false);
    }
  };

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = channels.filter(ch => ch.active).length;
  const totalCount = channels.length;

  return (
    <div className="channel-manager">
      <div className="manager-header">
        <h2>Manage TV Channels</h2>
        <div className="header-stats">
          <span className="stat">
            <strong>{activeCount}</strong> active
          </span>
          <span className="stat">
            <strong>{totalCount}</strong> total
          </span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="manager-controls">
        <input
          type="text"
          placeholder="Search channels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button
          onClick={saveAllChannels}
          disabled={saving}
          className="save-btn"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading channels...</div>
      ) : (
        <div className="channels-grid">
          {filteredChannels.length === 0 ? (
            <div className="no-results">
              No channels match your search
            </div>
          ) : (
            filteredChannels.map(channel => (
              <div key={channel.id} className="channel-item">
                <div className="channel-checkbox">
                  <input
                    type="checkbox"
                    id={`ch-${channel.id}`}
                    checked={channel.active}
                    onChange={() => toggleChannel(channel.id)}
                  />
                  <label htmlFor={`ch-${channel.id}`}></label>
                </div>

                <div className="channel-info">
                  {channel.icon && (
                    <img
                      src={`${logoBaseUrl}${channel.icon}`}
                      alt={channel.name}
                      className="channel-logo"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="channel-text">
                    <h3>{channel.name}</h3>
                    <p className="channel-id">{channel.id}</p>
                  </div>
                </div>

                <div className={`channel-status ${channel.active ? 'active' : 'inactive'}`}>
                  {channel.active ? '✓ Active' : '○ Inactive'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ChannelManager;
