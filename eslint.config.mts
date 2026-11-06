import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import typescriptEslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import type { ReactFlatConfig } from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

// eslint-plugin-react types `configs.flat` as `Record<string, ReactFlatConfig>`,
// so every lookup is possibly `undefined` under `noUncheckedIndexedAccess`.
function getReactFlatConfig(name: string): ReactFlatConfig {
    const config = react.configs.flat[name];
    if (config == null) {
        throw new Error(`eslint-plugin-react flat config "${name}" does not exist`);
    }
    return config;
}

export default defineConfig([
    {
        ignores: [
            "**/*.js",
            "**/*.jsx",
            "**/*.svg",
            "**/*.json",
            "**/coverage",
            "node_modules/**",
            // Nitro server build output (see vite.config.ts)
            ".output/**",
            ".nitro/**",
            // Paraglide JS compiler output (see paraglide.config.ts)
            "src/paraglide/**",
            // TanStack Router generated route tree (owned by the tanstackStart()
            // Vite plugin; it ships its own eslint-disable and @ts-nocheck)
            "src/routeTree.gen.ts",
        ],
    },

    js.configs.recommended,

    ...typescriptEslint.configs.recommended,
    ...typescriptEslint.configs.recommendedTypeChecked,

    getReactFlatConfig("recommended"),
    getReactFlatConfig("jsx-runtime"),

    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,

    ...tanstackQuery.configs["flat/recommended"],

    jsxA11y.flatConfigs.recommended,

    reactHooks.configs.flat["recommended-latest"],

    {
        languageOptions: {
            parser: typescriptEslint.parser,
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },

        settings: {
            react: {
                version: "19",
            },
            "import/resolver": {
                node: true,
            },
        },

        rules: {
            "prettier/prettier": "error",

            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",

            "no-console": [
                "error",
                {
                    allow: ["error", "warn", "info"],
                },
            ],

            "func-names": "off",
            "no-process-exit": "off",
            "object-shorthand": "off",
            "class-methods-use-this": "off",
            "no-shadow": ["error"],
            "func-style": ["error", "declaration"],

            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/naming-convention": "off",
            "@typescript-eslint/strict-boolean-expressions": "error",
            "@typescript-eslint/only-throw-error": [
                "error",
                {
                    allow: ["Redirect", "NotFoundError"],
                    allowThrowingAny: false,
                    allowThrowingUnknown: false,
                },
            ],
            "@typescript-eslint/prefer-promise-reject-errors": [
                "error",
                {
                    allowEmptyReject: true,
                },
            ],
            "@typescript-eslint/no-misused-promises": [
                "error",
                {
                    checksVoidReturn: false,
                },
            ],
            "@typescript-eslint/no-unbound-method": "off",
            "@typescript-eslint/prefer-optional-chain": "warn",

            "react/react-in-jsx-scope": "off",
            "react/jsx-no-bind": "off",
            "react/jsx-filename-extension": "off",
            "react/require-default-props": "off",
            "react/prop-types": [
                "error",
                {
                    skipUndeclared: true,
                },
            ],
            "react/jsx-props-no-spreading": "off",
            // One component per .tsx file, helpers included; see AGENTS.md.
            "react/no-multi-comp": ["error", { ignoreStateless: false }],

            "import/no-unresolved": "off",
            "import/namespace": "off",
            "import/prefer-default-export": "off",
            "import/no-extraneous-dependencies": "off",

            // `cn` from `@/lib/utils` is the one place to configure class
            // merging for the theme, so every component goes through it.
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "cn",
                            message: 'Import cn from "@/lib/utils".',
                        },
                    ],
                },
            ],
            "no-restricted-exports": "off",
            // A message looked up by a computed key keeps every message, in
            // both languages, in the browser's entry script, and so does `m`
            // handed on as a value, renamed or imported as a namespace, since
            // the bundler can no longer see which messages are read
            // (docs/i18n.md#messages).
            "no-restricted-syntax": [
                "error",
                ...[
                    // m[key], m[a + b]
                    "MemberExpression[computed=true][object.name='m'][property.type!='Literal'][property.type!='TemplateLiteral']",
                    // m[`language.${locale}`]; a template without `${}` is a literal
                    "MemberExpression[computed=true][object.name='m'] > TemplateLiteral.property[expressions.length>0]",
                    // const messages = m; messages = m; read(m); [...m]; { messages: m }
                    "VariableDeclarator > Identifier.init[name='m']",
                    "AssignmentExpression > Identifier.right[name='m']",
                    "CallExpression > Identifier.arguments[name='m']",
                    "SpreadElement > Identifier.argument[name='m']",
                    "ObjectExpression > Property > Identifier.value[name='m']",
                    // import { m as messages }; import * as messages
                    "ImportDeclaration[source.value=/paraglide\\/messages/] > ImportSpecifier[imported.name='m'][local.name!='m']",
                    "ImportDeclaration[source.value=/paraglide\\/messages/] > ImportNamespaceSpecifier",
                ].map((selector) => ({
                    selector,
                    message:
                        'Read each message straight from m with a string literal, m["section.key"], so the build leaves out the messages a page does not use.',
                })),
            ],
            "no-param-reassign": [
                "error",
                {
                    props: true,
                },
            ],
        },
    },
    {
        // The one file allowed to import the `cn` package.
        files: ["src/lib/utils.ts"],
        rules: { "no-restricted-imports": "off" },
    },
    prettierPlugin,
]);
