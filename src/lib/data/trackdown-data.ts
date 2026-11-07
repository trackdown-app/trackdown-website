// Marks this module server-only: importing it from client code fails the
// build, so the game data never ships to the browser.
import "@tanstack/react-start/server-only";
import { useStorage } from "nitro/storage";
import { createGameData } from "@/lib/data/game-data";

/**
 * The game data the server answers from: the `assets:trackdown-data` storage
 * mount, which `vite.config.ts` points at `TRACKDOWN_DATA_DIR`
 * (docs/data.md#where-the-files-come-from). In development Nitro reads the
 * files from disk; in a build each one is a lazy import inside the server
 * function. Without `TRACKDOWN_DATA_DIR` every file is missing.
 */
export const gameData = createGameData((path) =>
    useStorage("assets:trackdown-data").getItem(path),
);
