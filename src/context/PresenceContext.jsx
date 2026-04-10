import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const PresenceContext = createContext(null);

export const PresenceProvider = ({ children }) => {
    const { user } = useAuth();
    const [_showNumpad, _setShowNumpad] = useState(true);
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [viewers, setViewers] = useState({}); // { 'path': [user1, user2] }
    const currentPathRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const token = sessionStorage.getItem('zentrix_token');
        if (!token) return;

        let baseUrl = 'http://localhost:5050/api';
        baseUrl = baseUrl.replace('/api', '');

        const newSocket = io(baseUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('Presence Socket Connected');
        });

        newSocket.on('presence_update', (data) => {
            setOnlineUsers(data.onlineUsers || []);
            setViewers(data.viewers || {});
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            setSocket(null);
        };
    }, [user]);

    const trackPage = (path) => {
        if (!socket || !socket.connected) return;
        if (currentPathRef.current === path) return;
        
        currentPathRef.current = path;
        socket.emit('page_view', { path });
    };

    const value = {
        socket,
        onlineUsers,
        viewers,
        trackPage
    };

    return (
        <PresenceContext.Provider value={value}>
            {children}
        </PresenceContext.Provider>
    );
};
// eslint-disable-next-line react-refresh/only-export-components

export const usePresence = () => {
    const context = useContext(PresenceContext);
    if (!context) throw new Error('usePresence must be used within PresenceProvider');
    return context;
};
