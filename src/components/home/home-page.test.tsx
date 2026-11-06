import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home/home-page";

describe("HomePage", () => {
    it("renders the site name as the page's heading", () => {
        const html = renderToString(<HomePage />);

        expect(html).toContain("<h1");
        expect(html).toContain("Trackdown");
    });
});
