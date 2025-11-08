import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import noInlineValidators from './eslint-rules/no-inline-validators.js';
import noEnumsInModels from './eslint-rules/no-enums-in-models.js';
import noEnumColumns from './eslint-rules/no-enum-columns.js';
import noAwaitSchemaMethods from './eslint-rules/no-await-schema-methods.js';
import noUnawaitedQueries from './eslint-rules/no-unawaited-queries.js';

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
                    'no-unawaited-queries': noUnawaitedQueries,
                },
            },
        },
        rules: {
            'custom-rules/no-inline-validators': 'error',
            'custom-rules/no-enums-in-models': 'error',
            'custom-rules/no-enum-columns': 'error',
            'custom-rules/no-await-schema-methods': 'error',
            'custom-rules/no-unawaited-queries': 'error',
        },
    },
    {
        ignores: ['node_modules/**', 'build/**', 'dist/**'],
    },
];
