import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDatabase } from './lib/localDatabase.ts';

// Initialize database before rendering
initDatabase().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}).catch(error => {
  console.error('Failed to initialize database:', error);
  // Render error message
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1 style="color: #e53e3e; margin-bottom: 10px;">Database Error</h1>
        <p>Failed to initialize the database. Please try refreshing the page.</p>
        <p style="color: #718096; font-size: 0.875rem; margin-top: 10px;">Error: ${error.message}</p>
        <button 
          style="margin-top: 20px; padding: 8px 16px; background-color: #4299e1; color: white; border: none; border-radius: 4px; cursor: pointer;"
          onclick="window.location.reload()"
        >
          Refresh Page
        </button>
      </div>
    `;
  }
});