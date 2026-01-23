import { createBrowserRouter } from 'react-router-dom';
import Layout from './layout';
import ChatPage from './page';
import SettingsPage from './settings/page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'chat/:sessionId', element: <ChatPage /> },
    ],
  },
]);
