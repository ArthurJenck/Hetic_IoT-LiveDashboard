<script lang="ts">
  import { onMount } from 'svelte';

  interface TelemetryData {
    deviceId: string;
    ts: number;
    seq: number;
    tempC: number;
    humPct: number;
    batteryPct: number;
    tempUnit: 'C' | 'F';
    tempValue: number;
  }

  interface StatusData {
    deviceId: string;
    ts: number;
    status: 'online' | 'offline';
  }

  interface EventData {
    deviceId: string;
    ts: number;
    type: string;
  }

  interface DeviceState {
    deviceId: string;
    location: string;
    telemetry?: TelemetryData;
    status: 'online' | 'offline';
    lastEvent?: EventData;
  }

  type DeviceMap = Record<string, DeviceState>;

  const LOCATION_MAP: Record<string, string> = {
    'esp32-01': 'Paris',
    'esp32-02': 'Tokyo',
    'esp32-03': 'New York',
    'esp32-04': 'Sydney',
    'esp32-05': 'Londres'
  };

  const uri = 'ws://localhost:8080';
  let wsStatus = $state('idle');
  let devices = $state<DeviceMap>({});
  let selectedLocation = $state<string>('all');
  let selectedStatus = $state<string>('all');

  const connect = () => {
    wsStatus = 'connecting';

    const ws = new WebSocket(uri);
    ws.onopen = () => {
      wsStatus = 'open';
      ws.send('hello');
    };

    ws.onerror = () => {
      wsStatus = 'error';
    };

    ws.onclose = () => {
      wsStatus = 'closed';
    };

    ws.onmessage = (e) => {
      const message = JSON.parse(e.data);
      const { type, deviceId } = message;

      if (!devices[deviceId]) {
        devices[deviceId] = {
          deviceId,
          location: LOCATION_MAP[deviceId] || deviceId,
          status: 'offline'
        };
      }

      if (type === 'telemetry') {
        devices[deviceId].telemetry = message as TelemetryData;
      } else if (type === 'status') {
        devices[deviceId].status = (message as StatusData).status;
      } else if (type === 'events') {
        devices[deviceId].lastEvent = message as EventData;
      }
    };
  };

  const filteredDevices = $derived(() => {
    let result = Object.values(devices);

    if (selectedLocation !== 'all') {
      result = result.filter((d) => d.location === selectedLocation);
    }

    if (selectedStatus !== 'all') {
      result = result.filter((d) => d.status === selectedStatus);
    }

    return result.sort((a, b) => a.location.localeCompare(b.location));
  });

  const stats = $derived(() => {
    const onlineDevices = Object.values(devices).filter((d) => d.status === 'online');
    const devicesWithTelemetry = onlineDevices.filter((d) => d.telemetry);

    const avgTemp =
      devicesWithTelemetry.length > 0
        ? devicesWithTelemetry.reduce((sum, d) => sum + (d.telemetry?.tempC || 0), 0) /
          devicesWithTelemetry.length
        : 0;

    const avgHum =
      devicesWithTelemetry.length > 0
        ? devicesWithTelemetry.reduce((sum, d) => sum + (d.telemetry?.humPct || 0), 0) /
          devicesWithTelemetry.length
        : 0;

    return {
      avgTemp: avgTemp.toFixed(1),
      avgHum: avgHum.toFixed(1),
      onlineCount: onlineDevices.length,
      offlineCount: Object.values(devices).length - onlineDevices.length,
      totalCount: Object.values(devices).length
    };
  });

  const locations = $derived(() => {
    return ['all', ...new Set(Object.values(devices).map((d) => d.location))];
  });

  onMount(() => {
    connect();
  });
</script>

<div class="min-h-screen p-6 md:p-10">
  <div class="animate-fade-in mx-auto max-w-7xl space-y-8">
    <header class="space-y-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            class="text-5xl font-bold tracking-tight"
            style="font-family: var(--font-display); color: var(--color-deep-water);"
          >
            Stations Météo
          </h1>
          <p class="mt-2 text-lg" style="color: var(--color-storm);">Surveillance en temps réel</p>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-2 rounded-full px-4 py-2"
            style="background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px);"
          >
            <div
              class="h-2.5 w-2.5 rounded-full"
              style={wsStatus === 'open'
                ? 'background: var(--color-leaf);'
                : wsStatus === 'connecting'
                  ? 'background: var(--color-sun);'
                  : 'background: var(--color-sunset);'}
              class:animate-pulse-soft={wsStatus === 'connecting'}
            ></div>
            <span class="text-sm font-medium" style="color: var(--color-night);">
              {wsStatus === 'open'
                ? 'Connecté'
                : wsStatus === 'connecting'
                  ? 'Connexion...'
                  : 'Déconnecté'}
            </span>
          </div>

          {#if ['idle', 'closed'].includes(wsStatus)}
            <button
              class="rounded-full px-6 py-2 font-medium transition-all hover:scale-105"
              style="background: var(--color-ocean); color: white; box-shadow: var(--shadow-soft);"
              onclick={connect}
            >
              Connecter
            </button>
          {/if}
        </div>
      </div>

      {#if stats().totalCount > 0}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            class="rounded-3xl p-6 transition-all hover:scale-105"
            style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7)); backdrop-filter: blur(10px); box-shadow: var(--shadow-soft);"
          >
            <div class="text-sm font-medium" style="color: var(--color-storm);">
              Température moyenne
            </div>
            <div
              class="mt-2 text-3xl font-bold"
              style="font-family: var(--font-display); color: var(--color-sunset);"
            >
              {stats().avgTemp}°C
            </div>
          </div>

          <div
            class="rounded-3xl p-6 transition-all hover:scale-105"
            style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7)); backdrop-filter: blur(10px); box-shadow: var(--shadow-soft);"
          >
            <div class="text-sm font-medium" style="color: var(--color-storm);">
              Humidité moyenne
            </div>
            <div
              class="mt-2 text-3xl font-bold"
              style="font-family: var(--font-display); color: var(--color-ocean);"
            >
              {stats().avgHum}%
            </div>
          </div>

          <div
            class="rounded-3xl p-6 transition-all hover:scale-105"
            style="background: linear-gradient(135deg, rgba(200, 230, 201, 0.9), rgba(200, 230, 201, 0.7)); backdrop-filter: blur(10px); box-shadow: var(--shadow-soft);"
          >
            <div class="text-sm font-medium" style="color: var(--color-storm);">
              Stations en ligne
            </div>
            <div
              class="mt-2 text-3xl font-bold"
              style="font-family: var(--font-display); color: var(--color-leaf-dark);"
            >
              {stats().onlineCount}
            </div>
          </div>

          <div
            class="rounded-3xl p-6 transition-all hover:scale-105"
            style="background: linear-gradient(135deg, rgba(255, 138, 101, 0.2), rgba(255, 138, 101, 0.1)); backdrop-filter: blur(10px); box-shadow: var(--shadow-soft);"
          >
            <div class="text-sm font-medium" style="color: var(--color-storm);">
              Stations hors ligne
            </div>
            <div
              class="mt-2 text-3xl font-bold"
              style="font-family: var(--font-display); color: var(--color-sunset);"
            >
              {stats().offlineCount}
            </div>
          </div>
        </div>
      {/if}

      <div class="flex flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium" style="color: var(--color-storm);">Lieu :</span>
          <div class="flex flex-wrap gap-2">
            {#each locations() as location}
              <button
                class="rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer"
                style={selectedLocation === location
                  ? 'background: var(--color-ocean); color: white; box-shadow: var(--shadow-soft);'
                  : 'background: rgba(255, 255, 255, 0.6); color: var(--color-storm); backdrop-filter: blur(10px);'}
                onclick={() => (selectedLocation = location)}
              >
                {location === 'all' ? 'Tous' : location}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm font-medium" style="color: var(--color-storm);">État :</span>
          <div class="flex gap-2">
            {#each ['all', 'online', 'offline'] as status}
              <button
                class="rounded-full px-4 py-1.5 text-sm font-medium transition-all cursor-pointer"
                style={selectedStatus === status
                  ? 'background: var(--color-ocean); color: white; box-shadow: var(--shadow-soft);'
                  : 'background: rgba(255, 255, 255, 0.6); color: var(--color-storm); backdrop-filter: blur(10px);'}
                onclick={() => (selectedStatus = status)}
              >
                {status === 'all' ? 'Tous' : status === 'online' ? 'En ligne' : 'Hors ligne'}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </header>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredDevices() as device, i}
        {@const isOnline = device.status === 'online'}
        {@const telemetry = device.telemetry}

        <div
          class="group animate-fade-in rounded-3xl p-6 transition-all hover:scale-105"
          style={`
            background: ${
              isOnline
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(168, 216, 234, 0.3))'
                : 'linear-gradient(135deg, rgba(224, 224, 224, 0.6), rgba(224, 224, 224, 0.4))'
            };
            backdrop-filter: blur(10px);
            box-shadow: var(--shadow-soft);
            animation-delay: ${i * 0.1}s;
            opacity: ${isOnline ? '1' : '0.7'};
          `}
        >
          <div class="mb-4 flex items-start justify-between">
            <div>
              <h3
                class="text-2xl font-bold"
                style="font-family: var(--font-display); color: var(--color-deep-water);"
              >
                {device.location}
              </h3>
              <p class="text-xs" style="color: var(--color-storm);">{device.deviceId}</p>
            </div>

            <div
              class="flex items-center gap-2 rounded-full px-3 py-1"
              style={isOnline
                ? 'background: var(--color-leaf-light); color: var(--color-leaf-dark);'
                : 'background: var(--color-fog); color: var(--color-storm);'}
            >
              <div
                class="h-2 w-2 rounded-full"
                style={isOnline
                  ? 'background: var(--color-leaf-dark);'
                  : 'background: var(--color-storm);'}
              ></div>
              <span class="text-xs font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {#if telemetry}
            <div class="space-y-3">
              <div class="rounded-2xl p-4" style="background: rgba(255, 255, 255, 0.5);">
                <div
                  class="text-5xl font-bold"
                  style="font-family: var(--font-display); color: var(--color-sunset);"
                >
                  {telemetry.tempC.toFixed(1)}°C
                </div>
                <div class="mt-1 text-sm" style="color: var(--color-storm);">
                  {telemetry.tempValue.toFixed(1)}°{telemetry.tempUnit}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-xl p-3" style="background: rgba(255, 255, 255, 0.4);">
                  <div class="text-xs font-medium" style="color: var(--color-storm);">Humidité</div>
                  <div
                    class="mt-1 text-xl font-bold"
                    style="font-family: var(--font-display); color: var(--color-ocean);"
                  >
                    {telemetry.humPct.toFixed(1)}%
                  </div>
                </div>

                <div class="rounded-xl p-3" style="background: rgba(255, 255, 255, 0.4);">
                  <div class="text-xs font-medium" style="color: var(--color-storm);">Batterie</div>
                  <div
                    class="mt-1 text-xl font-bold"
                    style="font-family: var(--font-display); color: var(--color-leaf-dark);"
                  >
                    {telemetry.batteryPct}%
                  </div>
                </div>
              </div>

              <div class="space-y-1 text-xs" style="color: var(--color-storm);">
                <div class="flex justify-between">
                  <span>seq:</span>
                  <span class="font-mono">{telemetry.seq}</span>
                </div>
                <div class="flex justify-between">
                  <span>Dernière mise à jour:</span>
                  <span class="font-mono">{new Date(telemetry.ts * 1000).toLocaleTimeString()}</span
                  >
                </div>
              </div>
            </div>
          {:else}
            <div class="py-8 text-center text-sm" style="color: var(--color-storm);">
              Aucune donnée disponible
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if filteredDevices().length === 0}
      <div class="py-16 text-center">
        <p class="text-lg" style="color: var(--color-storm);">
          Aucune station ne correspond aux filtres sélectionnés
        </p>
      </div>
    {/if}
  </div>
</div>
