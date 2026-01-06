<script>
  let count = 0;

  const increment = () => {
    count++;
  };
</script>

<div class="size-screen flex h-screen flex-col items-center justify-center gap-2">
  <p class="text-xl">Compteur {count} !</p>
  <button onclick={increment} class="rounded-lg border px-2 py-1">Cliquer</button>
</div>
