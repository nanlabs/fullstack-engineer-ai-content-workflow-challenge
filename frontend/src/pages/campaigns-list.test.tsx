import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/test-utils";
import CampaignsListPage from "./campaigns-list";

vi.stubGlobal(
  "EventSource",
  class {
    addEventListener() {}
    removeEventListener() {}
    close() {}
    onerror = null;
    onopen = null;
  }
);

describe("CampaignsListPage", () => {
  it("renders campaign cards from the API", async () => {
    renderWithRouter(<CampaignsListPage />, { path: "/" });

    await waitFor(() => {
      expect(screen.getByText("Spring Sale 2026")).toBeInTheDocument();
    });

    expect(screen.getByText(/2 pieces/)).toBeInTheDocument();
  });

  it("shows language badges", async () => {
    renderWithRouter(<CampaignsListPage />, { path: "/" });

    await waitFor(() => {
      expect(screen.getByText("Spring Sale 2026")).toBeInTheDocument();
    });

    expect(screen.getByText("en")).toBeInTheDocument();
    expect(screen.getByText("es")).toBeInTheDocument();
    expect(screen.getByText("fr")).toBeInTheDocument();
  });

  it("clicking 'New Campaign' opens the dialog", async () => {
    const user = userEvent.setup();
    renderWithRouter(<CampaignsListPage />, { path: "/" });

    const newBtn = screen.getByRole("button", { name: /New Campaign/i });
    await user.click(newBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /New Campaign/i })).toBeInTheDocument();
  });
});
