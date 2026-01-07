<script lang="ts">
  import { onMount } from 'svelte';
  import { CountUp, type CountUpOptions } from 'countup.js';

  const props = $props<{
    value: number;
    startVal?: number;
    options?: CountUpOptions;
  }>();

  let el: HTMLSpanElement;
  let counter: CountUp | null = null;
  let previous = props.value;

  onMount(() => {
    counter = new CountUp(el, props.value, {
      startVal: props.startVal ?? props.value,
      ...props.options
    });

    if (!counter.error) {
      counter.start();
      previous = props.value;
    } else {
      console.error(counter.error);
    }
  });

  $effect(() => {
    if (!counter) return;
    const current = props.value;
    if (current === previous) return;

    counter.update(current);
    previous = current;
  });
</script>

<span bind:this={el}></span>
