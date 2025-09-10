<script lang="ts">
    import { m } from '#lib/paraglide/messages';
    import { raw } from '#lib/services/stringService';
    import Loader from '#components/Loader.svelte';
    import { Upload } from '@lucide/svelte';

    type Props = {
        name: string;
        title?: string;
        description?: string;
        width?: number;
        accept: string;
        fileName?: string;
        pathPrefix: string;
        id: number | string;
        disabled?: boolean;
        file?: File;
    };

    let {
        name,
        title = m['common.file.title'](),
        description = m['common.file.description'](),
        width = 96,
        accept,
        fileName = '',
        pathPrefix,
        id,
        disabled = false,
        file = $bindable(),
    }: Props = $props();

    let inputRef: HTMLInputElement;
    let acceptedFormats = $state(
        accept
            .split(' ')
            .map((format: string) => `.${format}`)
            .join(',')
    );
    let isDragging = $state(false);
    let isLoading = false;
    let previewSrc: string = $state(`/assets/${pathPrefix}/${id}?no-cache=true`);

    const handleFileChange = (event: Event): void => {
        const target = event.target as HTMLInputElement;
        if (disabled || !target.files || target.files.length === 0) return;

        file = target.files[0];
        fileName = file.name;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                previewSrc = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        } else {
            previewSrc = '';
        }
    };

    const handleDragOver = (event: DragEvent): void => {
        if (disabled) return;
        event.preventDefault();
        isDragging = true;
    };

    const handleDragLeave = (): void => {
        if (disabled) return;
        isDragging = false;
    };

    const handleDrop = (event: DragEvent): void => {
        if (disabled) return;
        event.preventDefault();
        isDragging = false;

        if (event.dataTransfer?.files?.length) {
            const dataTransfert = new DataTransfer();
            dataTransfert.items.add(event.dataTransfer.files[0]);
            inputRef.files = dataTransfert.files;
            inputRef.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            inputRef.click();
        }
    };

    const urlToFile = async (url: string, filename: string): Promise<File> => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type });
    };

    $effect((): void => {
        if (fileName && pathPrefix && id && inputRef) {
            if (!inputRef.files?.length) {
                urlToFile(`/assets/${pathPrefix}/${id}`, fileName).then((f) => {
                    const dt = new DataTransfer();
                    dt.items.add(f);
                    inputRef.files = dt.files;
                    inputRef.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }
        }
    });
</script>

<Loader {isLoading} />

<div class="flex flex-col w-full">
    {#if title}
        <div class="flex items-center gap-1 justify-center">
            <h3 class="font-semibold text-center mb-2">{title}</h3>
        </div>
    {/if}

    <button
        type="button"
        class={`w-${width} flex flex-col items-center justify-center border-2 border-gray-400 dark:border-white rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 m-auto p-3 cursor-pointer`}
        class:bg-blue-50={isDragging && !disabled}
        class:border-blue-500={isDragging && !disabled}
        onclick={() => !disabled && inputRef.click()}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onkeydown={handleKeyDown}
        aria-label="File uploader"
        {disabled}
    >
        <input bind:this={inputRef} type="file" class="sr-only" {name} accept={acceptedFormats} onchange={handleFileChange} {disabled} />

        <span class="text-primary-500">
            <Upload class="size-6" />
        </span>

        <span class="text-center text-sm text-gray-500 my-3">
            {#if fileName}
                {#if previewSrc}
                    <div class="mt-3 flex justify-center">
                        <img src={previewSrc} alt="Preview" class="size-24 object-cover rounded" />
                    </div>
                {:else}
                    {fileName}
                {/if}
            {:else}
                {@html raw(description)}
            {/if}
        </span>
    </button>
</div>
