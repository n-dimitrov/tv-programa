import React, { useState } from 'react';
import './App.css';
import ProgramsView from './components/ProgramsView';
import ChannelManager from './components/ChannelManager';

type ViewType = 'programs' | 'channels';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('programs');

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-container">
          <h1>📺 TV Program Manager</h1>
        </div>
      </header>

      <nav className="app-nav">
        <div className="app-container">
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
        </div>
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
