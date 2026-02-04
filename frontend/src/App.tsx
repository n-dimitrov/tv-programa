import React from 'react';
import './App.css';
import ProgramsView from './components/ProgramsView';
import ChannelManager from './components/ChannelManager';
import OscarManager from './components/OscarManager';

function App() {
  const isChannelsView = window.location.pathname.startsWith('/channels');
  const isOscarsView = window.location.pathname.startsWith('/oscars');

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-container">
          <div className="app-header-text">
            <h1><a href="/" className="header-link">7DaysTV</a></h1>
            <p className="app-header-subtitle">Програмата за последните 7 дни</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {isOscarsView ? <OscarManager /> : isChannelsView ? <ChannelManager /> : <ProgramsView />}
      </main>

      <footer className="app-footer">
        <p>
          7DaysTV използва данни от{' '}
          <a href="https://www.xn----8sbafg9clhjcp.bg" target="_blank" rel="noreferrer">
            ТВ Програма .BG
          </a>{' '}
          и{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            The Movie Database (TMDB)
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

export default App;
