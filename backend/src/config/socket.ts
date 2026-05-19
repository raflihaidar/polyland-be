import { Server } from "socket.io"

let io: Server

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FE_APP_URL,
    },
  })

  io.on("connection", (socket) => {
    socket.on("join-wallet-room", (walletAddress) => {
      socket.join(walletAddress)
    })
  })

  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io belum diinisialisasi!")
  }

  return io
}