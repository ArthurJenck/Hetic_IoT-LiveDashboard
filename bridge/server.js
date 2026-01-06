const http = require("http")

const PORT = 8080

const handleRequest = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("HTTP OK\n")
}

const handleReady = (req, res) => {
  console.log("I'm ready on http://localhost:" + PORT)
}

const server = http.createServer(handleRequest)

// GERE "L'upgrade de protocole"

const handleUpgrade = (req, res) => {
  socket.write(
    "HTTP/1.1 400 Bad Request\r\n" +
      "Content-Type: text/plain\r\n\r\n" +
      "Not a websocket yet\n"
  )
  socket.destroy()
}

server.on("upgrade", handleUpgrade)

server.listen(PORT, handleReady)
