const WebSocket = require("ws")

const PORT = 8080

const wss = new WebSocket.Server({ port: PORT })

wss.on("connection", (ws) => {
  ws.send("Hello from the other side")

  ws.on("message", (msg) => {
    ws.send("echo: " + msg)
  })
})

console.log("WebSocket Server on ws://localhost:8080")
