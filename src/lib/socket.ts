import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** One shared connection, created lazily the first time the online screen opens. */
export function getSocket(): Socket {
  if (!socket) socket = io({ transports: ['websocket', 'polling'] });
  return socket;
}
