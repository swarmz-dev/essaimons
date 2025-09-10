# Adonis & Svelte Starter Kit Sveltekit translations

---

## Adding a new language

### 1) Update `front/project.inlang/settings.json` `locales` field & add your new language code, by convention use 2 letters code.

### 2) Add your new language messages in `front/messages/{locale}.json` file.

### 3) Make Paraglide compile your new language by running :

```bash
    make paraglide
```

## Update an existing language

### 1) Add your new messages in `front/messages/{locale}.json` : don't forget any language.

### 2) Make Paraglide compile your new language by running :

```bash
    make paraglide
```

## Usage

### If paraglide has compiled your Paraglide changes, you can access it into `.svelte` files :

```html
    <script>
        import { m } from '$lib/paraglide/messages';
    </script>

    <h1>{m['login.title']()}</h1>
```
