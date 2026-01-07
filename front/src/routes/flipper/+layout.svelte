<script lang="ts">
  import { onMount } from 'svelte';

  const { children } = $props();

  onMount(() => {
    const originalBackground = document.body.style.background;
    document.body.style.background = 'var(--arcade-bg)';

    return () => {
      document.body.style.background = originalBackground;
    };
  });
</script>

{@render children()}

