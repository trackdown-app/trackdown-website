interface ImportMetaEnv {
    /**
     * The trackdown-data commit the build was made from, or `"local"`. Set at
     * build time by `define` in `vite.config.ts` (docs/deploy.md#the-game-data).
     * Unit tests run without that config, so a test that reads it stubs it
     * with `vi.stubEnv`.
     */
    readonly TRACKDOWN_DATA_REF: string;
}
