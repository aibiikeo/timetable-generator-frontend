import eslintConfigTrumpet from "@trumpet/eslint-config-next";

export default [
    ...eslintConfigTrumpet,
    // other configurations below, for example:
    {
        rules: {
            "import/no-unresolved": "error",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/consistent-type-imports": "warn",
            "@typescript-eslint/no-unsafe-member-access": "off",
        },
    },
];
