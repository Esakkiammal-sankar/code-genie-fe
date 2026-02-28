// src/socket.ts
import { io } from "socket.io-client";

// Flask backend URL
const SOCKET_URL = "http://localhost:5001";  // Change if hosted

export const socket = io(SOCKET_URL, {
  transports: ["websocket"], // ensures low-latency connection
});
