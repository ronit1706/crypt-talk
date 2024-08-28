import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatApp.css'; // Ensure this CSS file exists or adjust the path

const socket = io('http://localhost:3000'); // Connect to backend

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showRoomControls, setShowRoomControls] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [noRoomsMessage, setNoRoomsMessage] = useState('');
  const chatWindowRef = useRef(null); // Ref to access the chat window
  const roomInputRef = useRef(null); // Ref to access the room input field

  useEffect(() => {
    // Socket event listeners
    socket.on('receive-messages', (data) => {
      const { chatHistory, username: receivedUsername, room } = data;
      setMessages(chatHistory);
      setCurrentRoom(room);

      // Update username only if it's not set yet
      if (!username) {
        setUsername(receivedUsername);
      }
    });

    socket.on('update-rooms', (data) => {
      const { rooms: availableRooms, message } = data;
      setRooms(availableRooms);
      setNoRoomsMessage(message || '');
    });

    socket.on('enable-chatbox', () => {
      setChatEnabled(true);
    });

    return () => {
      // Clean up socket event listeners
      socket.off('receive-messages');
      socket.off('update-rooms');
      socket.off('enable-chatbox');
    };
  }, [username]);

  useEffect(() => {
    // Scroll to bottom when messages update
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('post-message', { room: currentRoom, message });
      setMessage('');
    }
  };

  const handleJoinRoom = (room) => {
    setChatEnabled(false); // Disable chatbox until the room is joined
    socket.emit('join-room', room);
    setCurrentRoom(room);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const roomName = roomInputRef.current.value.trim();
    if (roomName) {
      socket.emit('create-room', roomName);
      roomInputRef.current.value = '';
      setShowRoomControls(false); // Hide room controls after creating a room
    }
  };

  const toggleRoomControls = () => {
    setShowRoomControls(!showRoomControls);
  };

  return (
    <div className="chat-container">
      <div className="room-controls" style={{ display: showRoomControls ? 'block' : 'none' }}>
        <h3>Rooms</h3>
        <p className="no-rooms-message">{noRoomsMessage}</p>
        <ul>
          {rooms.map((room, index) => (
            <li key={index}>
              <button onClick={() => handleJoinRoom(room)}>{room}</button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleCreateRoom}>
          <input
            type="text"
            ref={roomInputRef}
            placeholder="Enter room name"
          />
          <button type="submit">Create Room</button>
        </form>
      </div>
      <div className="chat-area">
        <h2>{currentRoom ? `Chat Room: ${currentRoom}` : 'Anonymous Chat'}</h2>
        <div className={`chat-window ${!currentRoom ? 'no-room' : ''}`} ref={chatWindowRef}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.username === username ? 'own-message' : 'other-message'}`}
            >
              <strong>{msg.username}</strong> {msg.message}
            </div>
          ))}
        </div>
        <div className={`username-bar ${!currentRoom ? 'hidden' : ''}`}>
            {currentRoom ? `Your username: ${username}` : ''}
        </div>
        <form onSubmit={sendMessage}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={currentRoom ? 'Type your message here' : 'Join a room to chat'}
            disabled={!chatEnabled || !currentRoom} // Disable input if chat is not enabled or no room is selected
          />
          <button type="submit" disabled={!chatEnabled || !currentRoom}>Send</button>
        </form>
      </div>
      <button className="toggle-rooms-btn" onClick={toggleRoomControls}>
        {showRoomControls ? 'Hide Rooms' : 'Show Rooms'}
      </button>
    </div>
  );
}

export default ChatApp;