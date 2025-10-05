import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import noInlineValidators from './eslint-rules/no-inline-validators.js';
import noEnumsInModels from './eslint-rules/no-enums-in-models.js';
import noEnumColumns from './eslint-rules/no-enum-columns.js';
import noAwaitSchemaMethods from './eslint-rules/no-await-schema-methods.js';

export default [
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'custom-rules': {
                rules: {
                    'no-inline-validators': noInlineValidators,
                    'no-enums-in-models': noEnumsInModels,
                    'no-enum-columns': noEnumColumns,
                    'no-await-schema-methods': noAwaitSchemaMethods,
                },
            },
        },
        rules: {
            'custom-rules/no-inline-validators': 'error',
            'custom-rules/no-enums-in-models': 'error',
            'custom-rules/no-enum-columns': 'error',
            'custom-rules/no-await-schema-methods': 'error',
        },
    },
    {
        ignores: ['node_modules/**', 'build/**', 'dist/**'],
    },
];
