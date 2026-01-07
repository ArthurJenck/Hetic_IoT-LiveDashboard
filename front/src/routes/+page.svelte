<script lang="ts">
  interface TelemetryType {
    deviceId: string;
    ts: number;
    seq: number;
    tempC: number;
    humPct: number;
    batteryPct: number;
    tempUnit: 'C' | 'F';
    tempValue: number;
    lastUpdated: number
  }

  type TelemetryListType = Record<string, TelemetryType>;

  const uri = 'ws://localhost:8080';
  let status = 'idle';
  const telemetries = {} as TelemetryListType;

  const connect = () => {
    status = 'connecting';

    const ws = new WebSocket(uri);
    ws.onopen = () => {
      status = 'open';
      ws.send('hello');
    };

    ws.onerror = () => {
      status = 'error';
    };

    ws.onclose = () => {
      status = 'closed';
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data) as TelemetryType;
      console.log(data);
      telemetries[data.deviceId] = data;
      telemetries[data.deviceId].lastUpdated = Date.now()
    };
  };
</script>

<div class="flex flex-col items-center justify-center gap-2 p-4">
  <h1 class="font-semilbold text-lg">Websocket connection status: {status}</h1>
  {#if ['idle', 'closed'].includes(status)}
    <button
      class="cursor-pointer rounded-md bg-neutral-800 px-2 py-1 text-white hover:bg-neutral-700"
      onclick={connect}>Connect</button
    >
  {/if}
  <div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full gap-8">
    {#each Object.values(telemetries).sort( (a, b) => a.deviceId.localeCompare(b.deviceId) ) as telemetry}
      <div class="border rounded-lg p-4 bg-neutral-800 text-white">
        <h3 class="font-bold text-lg uppercase mb-1.5">{telemetry.deviceId}</h3>
        <ul class="space-y-1">
          <li><span class="font-medium">ts :</span> {telemetry.ts}</li>
          <li><span class="font-medium">seq :</span> {telemetry.seq}</li>
          <li><span class="font-medium">Température (°C) :</span> {telemetry.tempC} °C</li>
          <li><span class="font-medium">Pourcentage d'humidité :</span> {telemetry.humPct}</li>
          <li><span class="font-medium">Pourcentage de batterie :</span> {telemetry.batteryPct}</li>
          <li><span class="font-medium">Température :</span> {telemetry.tempValue} °{telemetry.tempUnit}</li>
          <li><span class="font-medium">Dernière mise à jour :</span> {new Date(telemetry.lastUpdated).toUTCString()}</li>
        </ul>
      </div>
    {/each}
  </div>
</div>
