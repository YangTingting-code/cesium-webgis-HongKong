import js from '@eslint/js';
import globals from 'globals';
import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import unusedImports from 'eslint-plugin-unused-imports'
export default [
    js.configs.recommended,
    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.{js,mjs,cjs,ts,vue}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: {
            'unused-imports': unusedImports,
        },
        rules: {
            // 可按需覆盖
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
            ],
            'vue/multi-word-component-names': 'off',
        },
    },
    // ✅ 忽略配置块
    {
        ignores: [
            'node_modules',
            'dist',
            'lib',
            'public',
            'src/lib/**',
            'src/static/**',
            'src/assets/icon**'
        ],
    },
];