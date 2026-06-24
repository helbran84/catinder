import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadMessages();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectSocket = () => {
    socketRef.current = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001');
    
    socketRef.current.emit('user_online', user.id);

    socketRef.current.on('receive_message', (data) => {
      if (data.matchId === parseInt(matchId)) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          match_id: data.matchId,
          sender_id: data.senderId,
          content: data.content,
          created_at: data.createdAt,
          sender_name: otherUser?.name
        }]);
      }
    });

    socketRef.current.on('user_typing', (data) => {
      if (data.matchId === parseInt(matchId) && data.userId !== user.id) {
        setIsTyping(true);
      }
    });

    socketRef.current.on('user_stop_typing', (data) => {
      if (data.matchId === parseInt(matchId) && data.userId !== user.id) {
        setIsTyping(false);
      }
    });
  };

  const loadMessages = async () => {
    try {
      const response = await matchService.getMessages(matchId);
      setMessages(response.data);
      
      if (response.data.length > 0) {
        const firstMsg = response.data[0];
        const otherId = firstMsg.sender_id === user.id 
          ? response.data.find(m => m.sender_id !== user.id)?.sender_id
          : firstMsg.sender_id;
        
        if (otherId) {
          setOtherUser({ 
            id: otherId, 
            name: response.data.find(m => m.sender_id === otherId)?.sender_name || 'Usuario'
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await matchService.sendMessage(matchId, newMessage.trim());
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');

      if (socketRef.current && otherUser) {
        socketRef.current.emit('send_message', {
          matchId: parseInt(matchId),
          senderId: user.id,
          receiverId: otherUser.id,
          content: newMessage.trim()
        });
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socketRef.current && otherUser) {
      socketRef.current.emit('typing', {
        matchId: parseInt(matchId),
        userId: user.id,
        receiverId: otherUser.id
      });

      clearTimeout(window.typingTimeout);
      window.typingTimeout = setTimeout(() => {
        socketRef.current.emit('stop_typing', {
          matchId: parseInt(matchId),
          userId: user.id,
          receiverId: otherUser.id
        });
      }, 2000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="chat-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button onClick={() => navigate('/matches')} className="back-btn">
          ← Volver
        </button>
        <div className="chat-user-info">
          <h2>{otherUser?.name || 'Chat'}</h2>
          {isTyping && <span className="typing-indicator">escribiendo...</span>}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <img src="/logotipo.png" alt="CATINDER" className="empty-chat-logo" />
            <p>Empieza la conversacion!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
            >
              <div className="message-content">
                <p>{msg.content}</p>
                <span className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit" disabled={!newMessage.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default ChatPage;
