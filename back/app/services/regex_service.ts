export default class RegexService {
    /**
     * Validates whether a string is a valid URI (http, https, or ftp).
     *
     * @param {string} uri - The URI string to validate.
     * @returns {boolean} True if the URI is valid, false otherwise.
     */
    public isValidUri(uri: string): boolean {
        const isValidUriRegex = /^(https?|ftp):\/\/[^\s\/$.?#].\S*$/i;
        return isValidUriRegex.test(uri);
    }

    /**
     * Validates whether a password is strong enough.
     * Password must contain at least one lowercase letter, one uppercase letter,
     * one special character, and be at least 8 characters long.
     *
     * @param {string} password - The password string to validate.
     * @returns {boolean} True if the password meets the criteria, false otherwise.
     */
    public isValidPassword(password: string): boolean {
        const isValidPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        return isValidPasswordRegex.test(password);
    }

    /**
     * Validates whether an email address is in a proper format.
     *
     * @param {string} email - The email string to validate.
     * @returns {boolean} True if the email format is valid, false otherwise.
     */
    public isValidEmail(email: string): boolean {
        const isValidEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return isValidEmailRegex.test(email);
    }

    /**
     * Formats a number by inserting spaces as thousand separators.
     * Example: 1234567 becomes "1 234 567".
     *
     * @param {number} number - The number to format.
     * @returns {string} The formatted number string with spaces.
     */
    public formatGameNumbers(number: number): string {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}
