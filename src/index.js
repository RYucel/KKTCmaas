import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Replace './App' with the path to your main component if different

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);