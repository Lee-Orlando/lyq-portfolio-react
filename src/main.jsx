import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ContentProvider } from './hooks/useContent';
import './styles.css';

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <ContentProvider>
            <App />
        </ContentProvider>
    </StrictMode>
);
