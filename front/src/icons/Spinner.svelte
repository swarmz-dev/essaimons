<script lang="ts">
    interface Props {
        size?: number;
    }

    let { size = 24 }: Props = $props();
</script>

<svg class="transition-all duration-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 100 100">
    <g>
        <circle stroke-dasharray="113.09733552923255 39.69911184307752" r="24" stroke-width="8" class="stroke-current" fill="none" cy="50" cx="50">
            <animateTransform keyTimes="0;1" values="0 50 50;360 50 50" dur="1" repeatCount="indefinite" type="rotate" attributeName="transform" />
        </circle>
    </g>
</svg>
