import React from 'react';
import './App.css';
import ProgramsView from './components/ProgramsView';
import ChannelManager from './components/ChannelManager';

function App() {
  const isChannelsView = window.location.pathname.startsWith('/channels');

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-container">
          <h1>📺 TV Program Manager</h1>
        </div>
      </header>

      <main className="app-main">
        {isChannelsView ? <ChannelManager /> : <ProgramsView />}
      </main>

      <footer className="app-footer">
        <p>TV Program Manager</p>
      </footer>
    </div>
  );
}

export default App;
