<script lang="ts">
    import { Moon, Sun } from '@lucide/svelte';
    import { ModeWatcher } from 'mode-watcher';

    import { toggleMode } from 'mode-watcher';
    import { Button } from '#lib/components/ui/button';
</script>

<ModeWatcher />

<Button onclick={toggleMode} variant="ghost" size="icon">
    <Sun class="size-8 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    <Moon class="absolute size-8 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    <span class="sr-only">Toggle theme</span>
</Button>
