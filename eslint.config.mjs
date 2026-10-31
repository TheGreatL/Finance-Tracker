import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/build/**',
            '**/.expo/**',
            '**/android/**',
            '**/ios/**',
            '**/coverage/**',
            '**/.turbo/**',
            '**/apps/api/**',
            '**/.husky/**',
            '**/brain/**',
            '**/.agents/**',
            '**/*.d.ts',
            '**/scripts/**'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ],
            'no-undef': 'off',
            'no-case-declarations': 'off'
        }
    }
);
