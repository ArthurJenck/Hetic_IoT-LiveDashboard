<script lang="ts">
  import { onMount } from 'svelte';

  interface TiltData {
    type: 'tilt';
    deviceId: string;
    ts: number;
    seq: number;
    ax: number;
    ay: number;
    az: number;
    tilt: boolean;
    nudge: boolean;
  }

  interface ButtonsData {
    type: 'buttons';
    deviceId: string;
    ts: number;
    seq: number;
    buttons: {
      leftFlipper: boolean;
      rightFlipper: boolean;
      start: boolean;
      coin: boolean;
      service: boolean;
    };
  }

  interface PlungerData {
    type: 'plunger';
    deviceId: string;
    ts: number;
    seq: number;
    action: 'pull' | 'release';
    position: number;
  }

  type FlipperEvent = TiltData | ButtonsData | PlungerData;

  interface DeviceState {
    leftFlipper: boolean;
    rightFlipper: boolean;
    start: boolean;
    coin: boolean;
    service: boolean;
    plungerAction: 'pull' | 'release' | null;
    plungerPosition: number;
    tilt: boolean;
    nudge: boolean;
  }

  interface EventHistoryItem {
    id: string;
    type: string;
    label: string;
    ts: number;
    color: string;
  }

  const uri = 'ws://localhost:8080';
  const MIN_DISPLAY_DURATION = 500;
  let wsStatus = $state<'idle' | 'connecting' | 'open' | 'error' | 'closed'>('idle');
  let selectedDevice = $state<string>('esp32-06');
  let availableDevices = $state<string[]>([]);
  let deviceStates = $state<Record<string, DeviceState>>({});
  let eventHistory = $state<EventHistoryItem[]>([]);
  let now = $state(Date.now());
  let activeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  let plungerPullTimestamps = new Map<string, number>();

  const currentState = $derived<DeviceState>(
    deviceStates[selectedDevice] || {
      leftFlipper: false,
      rightFlipper: false,
      start: false,
      coin: false,
      service: false,
      plungerAction: null,
      plungerPosition: 0,
      tilt: false,
      nudge: false,
    }
  );

  const plungerY = $derived(currentState.plungerAction === 'pull' ? 420 : 380);

  const leftFlipperRotation = $derived(currentState.leftFlipper ? -35 : 0);
  const rightFlipperRotation = $derived(currentState.rightFlipper ? 35 : 0);

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
      const data = JSON.parse(e.data) as FlipperEvent;
      
      if (!data.type || !['tilt', 'buttons', 'plunger'].includes(data.type)) {
        return;
      }

      const deviceId = data.deviceId;

      if (!availableDevices.includes(deviceId)) {
        availableDevices = [...availableDevices, deviceId];
      }

      if (!deviceStates[deviceId]) {
        deviceStates[deviceId] = {
          leftFlipper: false,
          rightFlipper: false,
          start: false,
          coin: false,
          service: false,
          plungerAction: null,
          plungerPosition: 0,
          tilt: false,
          nudge: false,
        };
      }

      const state = deviceStates[deviceId];

      if (data.type === 'tilt') {
        if (data.tilt) {
          setStateWithTimeout(deviceId, 'tilt', true);
          addEvent(deviceId, 'tilt', 'TILT!', data.ts, 'var(--arcade-neon-pink)');
        }
        if (data.nudge) {
          setStateWithTimeout(deviceId, 'nudge', true);
          addEvent(deviceId, 'nudge', 'Nudge', data.ts, 'var(--arcade-neon-orange)');
        }
      } else if (data.type === 'buttons') {
        const prev = { ...state };
        
        state.leftFlipper = data.buttons.leftFlipper;
        state.rightFlipper = data.buttons.rightFlipper;
        
        if (data.buttons.leftFlipper && !prev.leftFlipper) {
          addEvent(deviceId, 'leftFlipper', 'Left Flipper', data.ts, 'var(--arcade-neon-yellow)');
        }
        if (data.buttons.rightFlipper && !prev.rightFlipper) {
          addEvent(deviceId, 'rightFlipper', 'Right Flipper', data.ts, 'var(--arcade-neon-yellow)');
        }
        
        if (data.buttons.start) {
          setStateWithTimeout(deviceId, 'start', true);
          if (!prev.start) {
            addEvent(deviceId, 'start', 'Start', data.ts, 'var(--arcade-neon-green)');
          }
        }
        if (data.buttons.coin) {
          setStateWithTimeout(deviceId, 'coin', true);
          if (!prev.coin) {
            addEvent(deviceId, 'coin', 'Coin', data.ts, 'var(--arcade-neon-cyan)');
          }
        }
        if (data.buttons.service) {
          setStateWithTimeout(deviceId, 'service', true);
          if (!prev.service) {
            addEvent(deviceId, 'service', 'Service', data.ts, 'var(--arcade-neon-cyan)');
          }
        }
      } else if (data.type === 'plunger') {
        state.plungerPosition = data.position;

        if (data.action === 'pull') {
          state.plungerAction = 'pull';
          plungerPullTimestamps.set(deviceId, Date.now());
          addEvent(deviceId, 'plunger', 'Plunger Pull', data.ts, 'var(--arcade-neon-pink)');
          
          const timeoutKey = `${deviceId}-plungerAction`;
          const existingTimeout = activeTimeouts.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          
          const timeout = setTimeout(() => {
            const currentState = deviceStates[deviceId];
            if (currentState && currentState.plungerAction === 'pull') {
              currentState.plungerAction = null;
              deviceStates[deviceId] = currentState;
            }
            activeTimeouts.delete(timeoutKey);
            plungerPullTimestamps.delete(deviceId);
          }, MIN_DISPLAY_DURATION);
          
          activeTimeouts.set(timeoutKey, timeout);
        } else if (data.action === 'release') {
          const pullTimestamp = plungerPullTimestamps.get(deviceId);
          const now = Date.now();
          
          if (pullTimestamp && now - pullTimestamp < MIN_DISPLAY_DURATION) {
            const remainingTime = MIN_DISPLAY_DURATION - (now - pullTimestamp);
            
            const timeoutKey = `${deviceId}-plungerRelease`;
            const timeout = setTimeout(() => {
              const currentState = deviceStates[deviceId];
              if (currentState) {
                currentState.plungerAction = null;
                deviceStates[deviceId] = currentState;
              }
              activeTimeouts.delete(timeoutKey);
              plungerPullTimestamps.delete(deviceId);
            }, remainingTime);
            
            activeTimeouts.set(timeoutKey, timeout);
          } else {
            state.plungerAction = null;
            plungerPullTimestamps.delete(deviceId);
          }
          
          addEvent(deviceId, 'plunger', 'Plunger Release', data.ts, 'var(--arcade-neon-cyan)');
        }
      }

      deviceStates[deviceId] = state;
    };
  };

  const setStateWithTimeout = (deviceId: string, key: keyof DeviceState, value: boolean | string | null) => {
    const state = deviceStates[deviceId];
    if (!state) return;

    (state[key] as typeof value) = value;
    deviceStates[deviceId] = state;

    const timeoutKey = `${deviceId}-${key}`;
    const existingTimeout = activeTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      const currentState = deviceStates[deviceId];
      if (currentState) {
        if (key === 'plungerAction') {
          (currentState[key] as null) = null;
        } else {
          (currentState[key] as boolean) = false;
        }
        deviceStates[deviceId] = currentState;
      }
      activeTimeouts.delete(timeoutKey);
    }, MIN_DISPLAY_DURATION);

    activeTimeouts.set(timeoutKey, timeout);
  };

  const addEvent = (deviceId: string, type: string, label: string, ts: number, color: string) => {
    if (deviceId !== selectedDevice) return;

    const id = `${deviceId}-${type}-${ts}-${Math.random()}`;
    eventHistory = [
      { id, type, label, ts, color },
      ...eventHistory.slice(0, 19),
    ];
  };

  const formatTimestamp = (ts: number) => {
    const diff = Math.floor((now - ts * 1000) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return new Date(ts * 1000).toLocaleTimeString();
  };

  onMount(() => {
    connect();
    const interval = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => {
      clearInterval(interval);
      activeTimeouts.forEach(timeout => clearTimeout(timeout));
      activeTimeouts.clear();
      plungerPullTimestamps.clear();
    };
  });
</script>

<div class="min-h-screen p-6 md:p-10" style="background: var(--arcade-bg);">
  <div class="mx-auto max-w-6xl">
    <header class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <a
          href="/"
          class="mb-4 inline-block text-sm transition-all hover:scale-105"
          style="color: var(--arcade-neon-cyan); font-family: 'Orbitron', sans-serif; filter: var(--arcade-glow-cyan);"
        >
          ← Retour
        </a>
        <h1
          class="text-6xl font-black tracking-wider"
          style="font-family: 'Orbitron', sans-serif; color: var(--arcade-neon-pink); filter: var(--arcade-glow-pink); text-transform: uppercase;"
        >
          FLIPPER
        </h1>
        <p
          class="mt-2 text-sm tracking-widest"
          style="color: var(--arcade-neon-cyan); font-family: 'Orbitron', sans-serif;"
        >
          ARCADE MONITOR
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-2 rounded-lg px-4 py-2"
            style="background: var(--arcade-border); border: 2px solid var(--arcade-neon-cyan);"
          >
            <div
              class="h-2.5 w-2.5 rounded-full"
              style={wsStatus === 'open'
                ? 'background: var(--arcade-neon-green); box-shadow: 0 0 8px var(--arcade-neon-green);'
                : wsStatus === 'connecting'
                  ? 'background: var(--arcade-neon-yellow); box-shadow: 0 0 8px var(--arcade-neon-yellow);'
                  : 'background: var(--arcade-neon-pink); box-shadow: 0 0 8px var(--arcade-neon-pink);'}
              class:animate-pulse-soft={wsStatus === 'connecting'}
            ></div>
            <span class="text-xs font-bold tracking-wider" style="color: var(--arcade-neon-cyan); font-family: 'Orbitron', sans-serif;">
              {wsStatus === 'open'
                ? 'ONLINE'
                : wsStatus === 'connecting'
                  ? 'CONNECTING...'
                  : 'OFFLINE'}
            </span>
          </div>

          {#if ['idle', 'closed'].includes(wsStatus)}
            <button
              class="rounded-lg px-6 py-2 font-bold tracking-wider transition-all hover:scale-105"
              style="background: var(--arcade-neon-green); color: var(--arcade-bg); font-family: 'Orbitron', sans-serif; box-shadow: 0 0 16px var(--arcade-neon-green);"
              onclick={connect}
            >
              CONNECT
            </button>
          {/if}
        </div>

        {#if availableDevices.length > 0}
          <div class="flex gap-2">
            {#each availableDevices as device}
              <button
                class="rounded-lg px-4 py-2 text-xs font-bold tracking-wider transition-all hover:scale-105"
                style={selectedDevice === device
                  ? 'background: var(--arcade-neon-yellow); color: var(--arcade-bg); font-family: \'Orbitron\', sans-serif; box-shadow: 0 0 12px var(--arcade-neon-yellow);'
                  : 'background: var(--arcade-border); color: var(--arcade-neon-yellow); font-family: \'Orbitron\', sans-serif; border: 2px solid var(--arcade-neon-yellow);'}
                onclick={() => {
                  selectedDevice = device;
                  eventHistory = [];
                }}
              >
                {device}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </header>

    <div class="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div
        class="rounded-2xl p-8"
        style="background: var(--arcade-border); border: 3px solid var(--arcade-neon-pink); box-shadow: 0 0 24px rgba(255, 16, 240, 0.3);"
      >
        <svg
          viewBox="0 0 400 600"
          class="mx-auto w-full max-w-md"
          style="filter: drop-shadow(0 0 4px rgba(255, 16, 240, 0.5));"
        >
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color: #1a1a2e; stop-opacity: 1" />
              <stop offset="100%" style="stop-color: #0a0a14; stop-opacity: 1" />
            </linearGradient>
          </defs>

          <rect
            x="20"
            y="20"
            width="360"
            height="560"
            rx="30"
            fill="url(#boardGradient)"
            stroke="var(--arcade-neon-cyan)"
            stroke-width="3"
          />

          {#if currentState.tilt}
            <rect
              x="20"
              y="20"
              width="360"
              height="560"
              rx="30"
              fill="rgba(255, 16, 240, 0.3)"
              class="animate-pulse-soft"
            />
          {/if}

          <circle
            cx="200"
            cy="100"
            r="15"
            fill={currentState.start ? 'var(--arcade-neon-green)' : '#2a2a3e'}
            stroke="var(--arcade-neon-green)"
            stroke-width="2"
            style={currentState.start ? 'filter: var(--arcade-glow-green);' : ''}
            class="transition-all duration-100"
          />
          <text
            x="200"
            y="135"
            text-anchor="middle"
            fill="var(--arcade-neon-green)"
            font-size="10"
            font-family="Orbitron, sans-serif"
            font-weight="bold"
          >
            START
          </text>

          <circle
            cx="250"
            cy="100"
            r="12"
            fill={currentState.coin ? 'var(--arcade-neon-cyan)' : '#2a2a3e'}
            stroke="var(--arcade-neon-cyan)"
            stroke-width="2"
            style={currentState.coin ? 'filter: var(--arcade-glow-cyan);' : ''}
            class="transition-all duration-100"
          />
          <text
            x="250"
            y="130"
            text-anchor="middle"
            fill="var(--arcade-neon-cyan)"
            font-size="8"
            font-family="Orbitron, sans-serif"
            font-weight="bold"
          >
            COIN
          </text>

          <g transform={`translate(120, 500) rotate(${leftFlipperRotation} 0 0)`} class="transition-all duration-100">
            <path
              d="M -50 -8 L 50 -8 L 50 8 L -50 8 Z"
              fill="var(--arcade-neon-yellow)"
              stroke="var(--arcade-neon-yellow)"
              stroke-width="2"
              style={currentState.leftFlipper ? 'filter: var(--arcade-glow-yellow);' : ''}
            />
          </g>

          <g transform={`translate(280, 500) rotate(${rightFlipperRotation} 0 0)`} class="transition-all duration-100">
            <path
              d="M -50 -8 L 50 -8 L 50 8 L -50 8 Z"
              fill="var(--arcade-neon-yellow)"
              stroke="var(--arcade-neon-yellow)"
              stroke-width="2"
              style={currentState.rightFlipper ? 'filter: var(--arcade-glow-yellow);' : ''}
            />
          </g>

          <g class="transition-all duration-200">
            <rect
              x="340"
              y={plungerY}
              width="25"
              height="80"
              rx="4"
              fill={currentState.plungerAction === 'pull' ? 'var(--arcade-neon-pink)' : 'var(--arcade-neon-cyan)'}
              stroke={currentState.plungerAction === 'pull' ? 'var(--arcade-neon-pink)' : 'var(--arcade-neon-cyan)'}
              stroke-width="2"
              style={currentState.plungerAction === 'pull' ? 'filter: var(--arcade-glow-pink);' : 'filter: var(--arcade-glow-cyan);'}
            />
            <text
              x="330"
              y="371"
              text-anchor="middle"
              fill="var(--arcade-neon-cyan)"
              font-size="8"
              font-family="Orbitron, sans-serif"
              font-weight="bold"
              transform="rotate(90 352 370)"
            >
              PLUNGER
            </text>
          </g>

          {#if currentState.nudge}
            <text
              x="200"
              y="300"
              text-anchor="middle"
              fill="var(--arcade-neon-orange)"
              font-size="24"
              font-family="Orbitron, sans-serif"
              font-weight="black"
              style="filter: var(--arcade-glow-yellow);"
              class="animate-pulse-soft"
            >
              NUDGE
            </text>
          {/if}

          {#if currentState.tilt}
            <text
              x="200"
              y="250"
              text-anchor="middle"
              fill="var(--arcade-neon-pink)"
              font-size="48"
              font-family="Orbitron, sans-serif"
              font-weight="black"
              style="filter: var(--arcade-glow-pink);"
              class="animate-pulse-soft"
            >
              TILT!
            </text>
          {/if}
        </svg>
      </div>

      <div
        class="rounded-2xl p-6"
        style="background: var(--arcade-border); border: 3px solid var(--arcade-neon-green); box-shadow: 0 0 24px rgba(57, 255, 20, 0.2); max-height: 700px; overflow: hidden;"
      >
        <h2
          class="mb-4 text-xl font-black tracking-wider"
          style="font-family: 'Orbitron', sans-serif; color: var(--arcade-neon-green); filter: var(--arcade-glow-green);"
        >
          EVENT LOG
        </h2>

        <div class="relative h-150 overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: var(--arcade-neon-green) var(--arcade-bg);">
          {#if eventHistory.length === 0}
            <p class="text-center text-sm" style="color: var(--arcade-neon-cyan); font-family: 'Orbitron', sans-serif;">
              Waiting for events...
            </p>
          {:else}
            <div class="space-y-3">
              {#each eventHistory as event (event.id)}
                <div
                  class="animate-fade-in flex items-center gap-3 rounded-lg p-3"
                  style="background: rgba(26, 26, 46, 0.6); border-left: 3px solid {event.color};"
                >
                  <div
                    class="h-3 w-3 shrink-0 rounded-full"
                    style="background: {event.color}; box-shadow: 0 0 8px {event.color};"
                  ></div>
                  <div class="flex-1">
                    <div class="text-xs font-bold" style="color: {event.color}; font-family: 'Orbitron', sans-serif;">
                      {event.label}
                    </div>
                    <div class="mt-1 text-xs" style="color: var(--arcade-neon-cyan); font-family: 'Orbitron', sans-serif; opacity: 0.7;">
                      {formatTimestamp(event.ts)}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <div
            class="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
            style="background: linear-gradient(to top, var(--arcade-border), transparent);"
          ></div>
        </div>
      </div>
    </div>
  </div>
</div>
