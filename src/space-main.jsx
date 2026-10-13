import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SpaceApp from './SpaceApp';
import './styles.css';

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <SpaceApp />
    </StrictMode>
);
