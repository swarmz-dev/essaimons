import vine from '@vinejs/vine';
import { FieldContext } from '@vinejs/vine/types';
import Language from '#models/language';

const validSortFields: string[] = [...Language.$columnsDefinitions.keys()];

const sortByLanguageValidator = (value: unknown, _options: any, field: FieldContext): void => {
    if (typeof value !== 'string') return;

    const [fieldName, direction] = value.split(':');

    if (!fieldName || !direction) {
        field.report('The {{ field }} format must be "fieldName:asc" or "fieldName:desc"', 'sortBy', field);
        return;
    }

    if (!validSortFields.includes(fieldName)) {
        field.report(`Invalid field "{{ field }}". Allowed fields: ${validSortFields.join(', ')}`, 'sortBy', field);
        return;
    }

    if (direction !== 'asc' && direction !== 'desc') {
        field.report(`Invalid sort direction "{{ field }}". Must be "asc" or "desc"`, 'sortBy', field);
    }
};

export const sortByLanguageRule = vine.createRule(sortByLanguageValidator);
