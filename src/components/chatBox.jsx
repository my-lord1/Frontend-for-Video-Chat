import { useEffect, useRef, useState } from "react";
export const useChat = (socket1, roomId, userName, chatOpen) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const chatMessagesRef = useRef(null);

// Chat socket1 listeners
  useEffect(() => {
    if (!socket1) return;

    const handleChatMessage = (data) => {
      console.log("Received chat message:", data);
      setMessages(prev => [...prev, data]);
      if (!chatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };
    socket1.on("chat-box", handleChatMessage);
    
    return () => {
      socket1.off("chat-box", handleChatMessage);
    };
  }, [socket1, chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (newMessage.trim() && roomId && userName && socket1) {
      socket1.emit("sendMessage", {
        roomId,
        userName,
        message: newMessage.trim()
      });
      setNewMessage('');
    }
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    messages,
    newMessage,
    unreadCount,
    chatMessagesRef,
    sendMessage,
    handleChatKeyPress,
    formatTime,
    setNewMessage,

  }
}