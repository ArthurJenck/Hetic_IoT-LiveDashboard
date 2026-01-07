<script lang="ts">
  import { cn } from '@sglara/cn';
  import { onDestroy, onMount } from 'svelte';

  interface TelemetryType {
    deviceId: string;
    ts: number;
    seq: number;
    tempC: number;
    humPct: number;
    batteryPct: number;
    tempUnit: 'C' | 'F';
    tempValue: number;
    lastUpdated: number;
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
      const now = Date.now();
      
      telemetries[data.deviceId] = {
        ...data,
        lastUpdated: now
      }
      
      // Simulation de délai sur le ping pour l'état Online / Offline
      // const previous = telemetries[data.deviceId];

      // if (!previous) {
      // telemetries[data.deviceId] = {
      //   ...data,
      //   lastUpdated: now
      // };
      // return;
      // }

      // if (now - previous.lastUpdated >= 10000) {
      //   telemetries[data.deviceId] = {
      //     ...data,
      //     lastUpdated: now
      //   };
      // }
    };
  };

  let now = Date.now();
  let interval: number;

  onMount(() => {
    interval = window.setInterval(() => {
      now = Date.now();
    }, 1000);
  });
  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="space-y-2 p-4">
  <h1 class="text-xl font-medium">
    Websocket connection status: <span
      class={cn({
        'text-green-500': status === 'open',
        'text-orange-500': status === 'connecting',
        'text-red-500': status === 'closed'
      })}>{status.toLocaleUpperCase()}</span
    >
  </h1>

  {#if ['idle', 'closed'].includes(status)}
    <button
      class="cursor-pointer rounded-md bg-neutral-800 px-2 py-1 text-white hover:bg-neutral-700"
      onclick={connect}>Connect</button
    >
  {/if}

  <div class="grid w-full gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
    {#each Object.values(telemetries).sort( (a, b) => a.deviceId.localeCompare(b.deviceId) ) as telemetry}
      {@const isFresh = now - telemetry.lastUpdated < 1000}

      <div class="rounded-lg border bg-neutral-800 p-4 text-white">
        <h3 class="mb-1.5 text-lg font-bold uppercase">{telemetry.deviceId}</h3>
        <ul class="space-y-1">
          <li><span class="font-medium">ts :</span> {telemetry.ts}</li>
          <li><span class="font-medium">seq :</span> {telemetry.seq}</li>
          <li><span class="font-medium">Température (°C) :</span> {telemetry.tempC} °C</li>
          <li><span class="font-medium">Pourcentage d'humidité :</span> {telemetry.humPct}</li>
          <li><span class="font-medium">Pourcentage de batterie :</span> {telemetry.batteryPct}</li>
          <li>
            <span class="font-medium">Température :</span>
            {telemetry.tempValue} °{telemetry.tempUnit}
          </li>
          <li>
            <span class="font-medium">Dernière mise à jour :</span>
            {new Date(telemetry.lastUpdated).toLocaleString()}
          </li>
          <li>
            <span class="font-medium"> État : </span>
            <span class={cn(isFresh ? 'text-green-500' : 'text-red-500')}
              >{isFresh ? 'Online' : 'Offline'}</span
            >
          </li>
        </ul>
      </div>
    {/each}
  </div>
</div>
