import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import noInlineValidators from './eslint-rules/no-inline-validators.js';

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
                },
            },
        },
        rules: {
            'custom-rules/no-inline-validators': 'error',
        },
    },
    {
        ignores: ['node_modules/**', 'build/**', 'dist/**'],
    },
];
