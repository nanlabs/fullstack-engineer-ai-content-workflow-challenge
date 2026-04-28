import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

vi.stubGlobal(
  "EventSource",
  class {
    addEventListener() {}
    removeEventListener() {}
    close() {}
    onerror = null;
  }
);

describe("App smoke test", () => {
  it("renders without crashing and shows ACME branding", () => {
    render(<App />);
    expect(screen.getByText(/ACME/i)).toBeInTheDocument();
  });
});
