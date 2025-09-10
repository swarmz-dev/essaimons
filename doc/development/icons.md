# Adonis & Svelte Starter Kit icons documentation

The icons are stored in `front/src/lib/icons` and are imported in `front/src/lib/shared/Icon.svelte`.
The icons are in SVG format and are used in the frontend of Adonis & Svelte Starter Kit.

## Before creating a full custom icon

1. Have a look at [Lucid icons](https://lucide.dev/icons) : this is the official repository icons package. For more simplicity, prefer using it instead of creating your own icon which is much harder.

2. If you find your icon there, simply import is in PascalCase from `'@lucide/svelte'`.

    Here's a complete example :

    ```sveltehtml
        <script lang="ts">
            import { Moon } from '@lucide/svelte';
        </script>
    
        <Moon class="size-8" />
    ```
   To resize those icons, you can use tailwind `size` classes.

## Steps to create a new icon

1. Find your icon on [Iconify](https://icon-sets.iconify.design/).
2. Copy the SVG code of the icon you want to add.
3. Create a new svelte file in `front/src/lib/icons` with the same name as the icon.
4. Add to this file the following header code :

    ```sveltehtml
    <script lang="ts">
        interface Props {
            size?: number;
        }

        let { size = 24 }: Props = $props();
    </script>
    ```

5. Paste the SVG code you copied in step 2.
6. Replace the first line of the SVG code with the following line:

    ```sveltehtml
    <svg class="transition-all duration-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    ```
    Caution, replace the above viewbox with the one from the SVG code you copied.

7. Add your file name to `iconNames` array located into `front/src/lib/shared/Icon.svelte` directory.

## Usage

### You can use your icons in the frontend of Adonis & Svelte Starter Kit using the following code:

   ```sveltehtml
   <Icon name="yourIconName" />
   ```

### Conventions

   - PascalCase for the file name
   - camelCase for the name property

### Styling

   - You can use the `size` property to change the size of the icon.
   - You can surround the icon with a `span` element to change icon's color :

   ```sveltehtml
   <span class="text-primary-500">
       <Icon name="yourIconName" />
   </span>
   ```

---

### Development index documentation

&larr; [Back to index](index.md)
