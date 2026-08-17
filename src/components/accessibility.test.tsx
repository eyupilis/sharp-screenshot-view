// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

describe("core component accessibility", () => {
  it("has no automatically detectable violations", async () => {
    const { container } = render(
      <main>
        <Card>
          <CardHeader>
            <CardTitle>Incident kararı</CardTitle>
          </CardHeader>
          <CardContent>
            <Button aria-label="Severity kararını onayla">Onayla</Button>
          </CardContent>
        </Card>
      </main>,
    );
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
