import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { TooltipProvider } from './src/components/ui/tooltip';
import { router } from './src/app/router';
import './src/styles/globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <TooltipProvider>
    <RouterProvider router={router} />
  </TooltipProvider>
);