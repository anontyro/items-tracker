import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Board Game Price Tracker
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#666' }}>
        Desktop app placeholder - shared UI components will be integrated here.
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Status</h2>
        <p style={{ margin: 0 }}>Electron renderer is working ✓</p>
        <p style={{ margin: '0.5rem 0 0' }}>Next: Integrate shared types, API client, and UI components</p>
      </div>
    </div>
  );
};

export default App;
