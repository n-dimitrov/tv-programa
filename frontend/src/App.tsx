import React, { useState, useEffect } from 'react';
import './App.css';
import ProgramsView from './components/ProgramsView';
import ChannelManager from './components/ChannelManager';
import { API_URL } from './config';

type ViewType = 'programs' | 'channels';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('programs');
  const [apiStatus, setApiStatus] = useState<string>('checking...');

  useEffect(() => {
    // Check if API is running
    fetch(`${API_URL}/`)
      .then(res => {
        if (res.ok) setApiStatus('running');
        else setApiStatus('error');
      })
      .catch(() => setApiStatus('not connected'));
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <h1>📺 TV Program Manager</h1>
        <div className="header-status">
          <span className={`api-status ${apiStatus}`}>
            API: {apiStatus}
          </span>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${currentView === 'programs' ? 'active' : ''}`}
          onClick={() => setCurrentView('programs')}
        >
          Programs
        </button>
        <button
          className={`nav-btn nav-btn-right ${currentView === 'channels' ? 'active' : ''}`}
          onClick={() => setCurrentView('channels')}
        >
          Channels
        </button>
      </nav>

      <main className="app-main">
        {currentView === 'programs' && <ProgramsView />}
        {currentView === 'channels' && <ChannelManager />}
      </main>

      <footer className="app-footer">
        <p>TV Program Manager</p>
      </footer>
    </div>
  );
}

export default App;
