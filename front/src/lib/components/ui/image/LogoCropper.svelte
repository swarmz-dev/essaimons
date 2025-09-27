<script lang="ts">
    import { Button } from '#lib/components/ui/button';
    import { m } from '#lib/paraglide/messages';
    import { createEventDispatcher, onDestroy, onMount } from 'svelte';

    const PREVIEW_SIZE = 320;
    const OUTPUT_SIZE = 512;

    const { file } = $props<{ file: File }>();

    const dispatch = createEventDispatcher<{ confirm: { file: File; previewUrl: string }; cancel: void }>();

    let canvasRef: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null = null;
    let imageSrc: string | null = null;
    let image: HTMLImageElement | null = null;

    let scale: number = $state(1);
    let minScale: number = $state(1);
    let maxScale: number = $state(4);
    let offsetX: number = $state(0);
    let offsetY: number = $state(0);
    let backgroundColor = $state('#ffffff');

    let dragging: boolean = $state(false);
    let startPointerX = 0;
    let startPointerY = 0;
    let startOffsetX = 0;
    let startOffsetY = 0;

    const sanitizeName = (value: string): string => {
        const base = value.replace(/\.[^/.]+$/, '') || 'logo';
        return base.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    };

    const clampOffsets = (): void => {
        if (!image) return;
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const maxOffsetX = Math.max((scaledWidth - PREVIEW_SIZE) / 2, 0);
        const maxOffsetY = Math.max((scaledHeight - PREVIEW_SIZE) / 2, 0);
        offsetX = Math.min(Math.max(offsetX, -maxOffsetX), maxOffsetX);
        offsetY = Math.min(Math.max(offsetY, -maxOffsetY), maxOffsetY);
    };

    const draw = (): void => {
        if (!ctx || !image) return;
        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
        ctx.fillStyle = backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const drawX = (PREVIEW_SIZE - scaledWidth) / 2 + offsetX;
        const drawY = (PREVIEW_SIZE - scaledHeight) / 2 + offsetY;

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
    };

    const initialiseImage = (): void => {
        if (!canvasRef) return;
        ctx = canvasRef.getContext('2d');
        if (!ctx) return;

        image = new Image();
        image.onload = () => {
            if (!image) return;
            const coverScale = Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
            const containScale = Math.min(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
            minScale = containScale;
            scale = coverScale;
            maxScale = Math.max(coverScale, containScale) * 4;
            offsetX = 0;
            offsetY = 0;
            clampOffsets();
            draw();
        };
        if (imageSrc) {
            image.src = imageSrc;
        }
    };

    onMount(() => {
        imageSrc = URL.createObjectURL(file);
        initialiseImage();
    });

    onDestroy(() => {
        if (imageSrc) {
            URL.revokeObjectURL(imageSrc);
        }
    });

    $effect(() => {
        backgroundColor;
        if (ctx && image) {
            draw();
        }
    });

    const handleScaleChange = (event: Event): void => {
        const value = Number((event.currentTarget as HTMLInputElement).value);
        scale = value;
        clampOffsets();
        draw();
    };

    const handlePointerDown = (event: PointerEvent): void => {
        event.preventDefault();
        if (!canvasRef) return;
        dragging = true;
        startPointerX = event.clientX;
        startPointerY = event.clientY;
        startOffsetX = offsetX;
        startOffsetY = offsetY;
        canvasRef.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent): void => {
        if (!dragging) return;
        event.preventDefault();
        if (!dragging) return;
        const deltaX = event.clientX - startPointerX;
        const deltaY = event.clientY - startPointerY;
        offsetX = startOffsetX + deltaX;
        offsetY = startOffsetY + deltaY;
        clampOffsets();
        draw();
    };

    const handlePointerUp = (event: PointerEvent): void => {
        dragging = false;
        if (canvasRef) {
            canvasRef.releasePointerCapture(event.pointerId);
        }
    };

    const reset = (): void => {
        if (!image) return;
        const coverScale = Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
        const containScale = Math.min(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
        scale = coverScale;
        minScale = containScale;
        maxScale = Math.max(coverScale, containScale) * 4;
        offsetX = 0;
        offsetY = 0;
        clampOffsets();
        draw();
    };

    const confirm = (): void => {
        if (!image) return;
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = OUTPUT_SIZE;
        outputCanvas.height = OUTPUT_SIZE;
        const outputCtx = outputCanvas.getContext('2d');
        if (!outputCtx) return;

        outputCtx.fillStyle = backgroundColor || '#ffffff';
        outputCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const drawX = (PREVIEW_SIZE - scaledWidth) / 2 + offsetX;
        const drawY = (PREVIEW_SIZE - scaledHeight) / 2 + offsetY;
        const ratio = OUTPUT_SIZE / PREVIEW_SIZE;

        outputCtx.drawImage(image, drawX * ratio, drawY * ratio, scaledWidth * ratio, scaledHeight * ratio);

        outputCanvas.toBlob(
            (blob) => {
                if (!blob) return;
                const safeName = `${sanitizeName(file.name)}-cropped.png`;
                const croppedFile = new File([blob], safeName, { type: 'image/png' });
                const previewUrl = URL.createObjectURL(blob);
                dispatch('confirm', { file: croppedFile, previewUrl });
            },
            'image/png',
            0.92
        );
    };

    const cancel = (): void => {
        dispatch('cancel');
    };
</script>

<div class="w-full max-w-xl space-y-5 rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950">
    <h2 class="text-lg font-semibold text-foreground">{m['admin.organization.crop.title']()}</h2>
    <p class="text-sm text-muted-foreground">{m['admin.organization.crop.instructions']()}</p>

    <div
        class="relative mx-auto grid h-[320px] w-[320px] place-items-center overflow-hidden rounded-3xl border border-border/70 shadow-inner cursor-grab"
        style={`background-color: ${backgroundColor || '#ffffff'};`}
        class:cursor-grabbing={dragging}
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onpointerleave={handlePointerUp}
        onpointercancel={handlePointerUp}
    >
        <canvas bind:this={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} class="h-full w-full">
            {m['admin.organization.crop.unsupported']()}
        </canvas>
    </div>

    <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-muted-foreground" for="crop-scale">{m['admin.organization.crop.zoom']()}</label>
        <input
            id="crop-scale"
            type="range"
            min={minScale}
            max={maxScale}
            step="0.01"
            bind:value={scale}
            oninput={handleScaleChange}
            class="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
        />
        <div class="text-xs font-medium text-muted-foreground">{scale.toFixed(2)}×</div>
    </div>

    <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-muted-foreground" for="crop-background">{m['admin.organization.crop.background']()}</label>
        <div class="flex items-center gap-3">
            <input id="crop-background" type="color" bind:value={backgroundColor} class="h-10 w-16 cursor-pointer appearance-none rounded-xl border border-border/70 bg-transparent p-0" />
            <span class="text-xs text-muted-foreground">{backgroundColor.toUpperCase()}</span>
        </div>
    </div>

    <div class="flex items-center gap-3">
        <Button type="button" variant="outline" onclick={reset}>{m['admin.organization.crop.reset']()}</Button>
        <div class="flex-1"></div>
        <Button type="button" variant="ghost" onclick={cancel}>{m['admin.organization.crop.cancel']()}</Button>
        <Button type="button" onclick={confirm}>{m['admin.organization.crop.apply']()}</Button>
    </div>
</div>
