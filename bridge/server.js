const WebSocket = require("ws")
const mqtt = require("mqtt")
const client = mqtt.connect("mqtt://captain.dev0.pandor.cloud:1884")

const webSocketClients = []
const PORT = 8080
const wss = new WebSocket.Server({ port: PORT })
const TOPICS = [
  "classroom/+/telemetry",
  "classroom/+/status",
  "classroom/+/events",
]

client.on("connect", () => {
  TOPICS.forEach((topic) => {
    client.subscribe(topic, (err) => {
      if (!err) {
        console.log("Subscribed to topic " + topic)
      }
    })
  })
})

wss.on("connection", (ws) => {
  webSocketClients.push(ws)
})

client.on("message", (topic, message) => {
  const data = JSON.parse(message.toString())
  const topicParts = topic.split("/")
  const messageType = topicParts[2]

  const payload = {
    type: messageType,
    ...data,
  }

  console.log(payload)

  for (const ws of webSocketClients) {
    ws.send(JSON.stringify(payload))
  }
})

console.log("Listening on port 8080")
