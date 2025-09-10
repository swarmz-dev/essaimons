export default class StringService {
    /**
     * Capitalizes the first letter of a string.
     *
     * @param {string} str - The input string to be capitalized.
     * @returns {string} A capitalized version of the input string.
     */
    public capitalize = (str: string): string => {
        if (str.length === 0) {
            return '';
        }
        return str[0].toUpperCase() + str.slice(1);
    };
}
