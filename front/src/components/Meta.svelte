<script lang="ts">
    import { MetaTags, type OpenGraph, type Twitter } from 'svelte-meta-tags';
    import { location } from '#lib/stores/locationStore';
    import { language } from '#lib/stores/languageStore';
    import { m } from '#lib/paraglide/messages';
    import { get } from 'svelte/store';
    import { locales } from '#lib/paraglide/runtime';
    import { PUBLIC_FRONT_URI, PUBLIC_TWITTER_HANDLE } from '$env/static/public';

    interface OpenGraphImage {
        url: string;
        width: number;
        height: number;
        alt: string;
    }

    interface Meta {
        title: string;
        description: string;
        keywords: string[];
        languageAlternates: { hrefLang: string; href: string }[];
        openGraph: OpenGraph;
        twitter: Twitter;
    }

    type Props = {
        title: string;
        description: string;
        keywords: string[];
        pathname?: string;
        additionalOpenGraphImages?: OpenGraphImage[];
    };

    let { title, description, keywords, pathname = '', additionalOpenGraphImages = [] }: Props = $props();

    let baseImage: OpenGraphImage = {
        url: `${PUBLIC_FRONT_URI}/assets/logo-1200x1200.webp`,
        width: 1200,
        height: 1200,
        alt: `${m['common.logo.alt']()}`,
    };

    const meta: Meta = {
        title,
        description,
        keywords,
        languageAlternates: pathname
            ? locales.map((language: string) => ({
                  hrefLang: language,
                  href: `${PUBLIC_FRONT_URI}/${language}${pathname}`,
              }))
            : [],
        openGraph: {
            type: 'website',
            title,
            description,
            url: `${PUBLIC_FRONT_URI}${get(location)}`,
            locale: get(language),
            siteName: 'Adonis & Svelte Starter Kit',
            images: [baseImage, ...additionalOpenGraphImages],
        },
        twitter: {
            title,
            description,
            cardType: 'summary',
            site: PUBLIC_TWITTER_HANDLE,
            image: additionalOpenGraphImages[0]?.url ?? baseImage.url,
            imageAlt: additionalOpenGraphImages[0]?.alt ?? title,
        } satisfies Twitter,
    };
</script>

<MetaTags {...meta} />
