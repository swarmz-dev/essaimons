import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import noInlineValidators from './eslint-rules/no-inline-validators.js';
import noEnumsInModels from './eslint-rules/no-enums-in-models.js';

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
                },
            },
        },
        rules: {
            'custom-rules/no-inline-validators': 'error',
            'custom-rules/no-enums-in-models': 'error',
        },
    },
    {
        ignores: ['node_modules/**', 'build/**', 'dist/**'],
    },
];
