import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["node_modules/", ".vercel/"] },
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
            "prefer-const": "error",
            "no-var": "error",
            eqeqeq: ["error", "always"],
            "no-console": ["warn", { allow: ["warn", "error"] }],
        },
    },
    {
        files: ["js/**/*.js", "shared/**/*.js"],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ["js/theme-init.js"],
        languageOptions: { sourceType: "script" },
    },
    {
        files: ["api/**/*.js", "lib/**/*.js", "tests/**/*.js", "scripts/**/*.js", "*.config.js"],
        languageOptions: { globals: globals.node },
    },
    {
        files: ["scripts/**/*.js"],
        rules: { "no-console": "off" },
    },
];
