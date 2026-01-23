import { createBrowserRouter } from 'react-router-dom';
import Layout from './layout';
import ChatPage from './page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ChatPage /> },
      { path: 'chat/:sessionId', element: <ChatPage /> },
    ],
  },
]);
