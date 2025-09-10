# Adonis & Svelte Starter Kit Development Tuyau

---

Tuyau is the official Adonis API fetching library, providing type-safe calls to the Adonis backend.

Here's the [Tuyau documentation](https://adonisjs.com/blog/introducing-tuyau).

When you update or create an Adonis endpoint, make sure to run :

```bash
    make tuyau
```

Don't forget that you have to call

```typescript
    await request.validateUsing(Validator);
```

in your controller's method to allow Tuyau to handle it.

### Development index documentation

&larr; [Back to index](index.md)
