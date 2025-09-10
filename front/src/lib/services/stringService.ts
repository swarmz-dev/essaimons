export const raw: (str: string) => string = (str: string): string => {
    return str.split('\n').join('<br>');
};

export const toCamelCase = (str: string): string => {
    if (str.length === 0) {
        return '';
    }
    return str[0].toUpperCase() + str.slice(1);
};
