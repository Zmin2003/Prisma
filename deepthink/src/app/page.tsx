import React from 'react';
import { useParams } from 'react-router-dom';
import App from '../../App';

export default function ChatPage() {
  const { sessionId } = useParams();
  return <App initialSessionId={sessionId} />;
}
