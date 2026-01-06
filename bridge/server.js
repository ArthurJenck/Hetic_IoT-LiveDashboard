const http = require("http")
const crypto = require("crypto")

const PORT = 8080

const acceptValue = (key) => {
  const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

  return crypto
    .createHash("sha1")
    .update(key + GUID, "binary")
    .digest("base64")
}

const sendText = (socket, text) => {
  // FIN + text opcode
  const payload = Buffer.from(text, "utf8")
  const len = payload.length

  let header
  if (len < 126) {
    header = Buffer.alloc(2)
    header[0] = 0x81
    header[1] = len // server frames are NOT masked
  } else if (len < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x81
    header[1] = 127
    header.writeBigUInt64BE(BigInt(len), 2)
  }

  socket.write(Buffer.concat([header, payload]))
}

const handleRequest = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("HTTP OK\n")
}

const handleReady = (req, res) => {
  console.log("I'm ready on http://localhost:" + PORT)
}

const server = http.createServer(handleRequest)

// GERE "L'upgrade de protocole"

const handleUpgrade = (req, socket) => {
  const upgrade = (req.headers["upgrade"] || "").toLowerCase()
  const key = req.headers["sec-websocket-key"]
  const version = req.headers["sec-websocket-version"]

  if (upgrade !== "websocket" || !key || version !== "13") {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n")
    socket.destroy()
    return
  }

  const accept = acceptValue(key)

  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-Websocket-Accept: ${accept}\r\n` +
      "\r\n"
  )

  sendText(socket, "Hello from the other side")
}

server.on("upgrade", handleUpgrade)

server.listen(PORT, handleReady)
