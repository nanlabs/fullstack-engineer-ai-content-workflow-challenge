import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders ACME Content Workflow heading", () => {
    render(<App />);
    expect(screen.getByText("ACME Content Workflow")).toBeInTheDocument();
  });
});
