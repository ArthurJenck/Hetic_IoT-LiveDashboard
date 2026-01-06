<script>
  const uri = "ws://localhost:8080"
  let status = "idle"

  const connect = () => {
    status = "connecting"

    const ws = new WebSocket(uri)
    ws.onopen = () => {
      status = "open"
      ws.send("hello")
    }

    ws.onerror = () => {
      status = "error"
    }

    ws.onclose = () => {
      status = "closed"
    }

    ws.onmessage =(e) => {
      console.log(e.data)
    }
  }
</script>

<div class="flex flex-col justify-center items-center gap-2 p-4">
  <h1 class="font-semilbold text-lg">Websocket connection status: {status}</h1>
  {#if ["idle", "closed"].includes(status)}
  <button class="rounded-md px-2 py-1 text-white bg-neutral-800 hover:bg-neutral-700 cursor-pointer" onclick={connect}>Connect</button>
  {/if}
</div>