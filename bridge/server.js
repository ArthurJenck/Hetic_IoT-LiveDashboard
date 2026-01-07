const WebSocket = require("ws")
const mqtt = require("mqtt")
const client = mqtt.connect("mqtt://captain.dev0.pandor.cloud:1884")

const webSocketClients = []
const PORT = 8080
const wss = new WebSocket.Server({ port: PORT })
const TOPIC = "classroom/+/telemetry"

client.on("connect", () => {
  client.subscribe(TOPIC, (err) => {
    if (!err) {
      console.log("Subscribed to topic " + TOPIC)
    }
  })
})

wss.on("connection", (ws) => {
  webSocketClients.push(ws)
})

client.on("message", (topic, message) => {
  const payload = JSON.parse(message.toString())

  for (const ws of webSocketClients) {
    ws.send(JSON.stringify(payload))
  }
})

console.log("Listening on port 8080")
