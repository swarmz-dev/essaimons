export default class SlugifyService {
    /**
     * Converts a given string into a URL-friendly slug.
     *
     * @param {string} text - The input string to be slugified.
     * @returns {string} A slugified version of the input string suitable for URLs.
     */
    public slugify(text: string): string {
        return text
            .toString() // Ensure the input is a string
            .normalize('NFD') // Normalize to Unicode NFD form (decomposes accented characters)
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
            .toLowerCase() // Convert to lowercase
            .trim() // Trim whitespace from both ends
            .replace(/\s+/g, '-') // Replace spaces and consecutive spaces with hyphens
            .replace(/[^\w\-.]+/g, '') // Remove invalid characters (keep letters, numbers, underscores, hyphens, and dots)
            .replace(/--+/g, '-'); // Replace multiple hyphens with a single hyphen
    }
}
