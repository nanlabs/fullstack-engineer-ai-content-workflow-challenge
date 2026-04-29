import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/test/test-utils";
import { CampaignCard } from "./campaign-card";
import type { Campaign } from "@/api/types";

const campaign: Campaign = {
  id: "c1",
  name: "Spring Sale 2026",
  brief:
    "A very long brief that should get truncated when it exceeds the card display limit because it is too long to show fully in the card view.",
  source_language: "en",
  target_languages: ["es", "fr", "de"],
  content_pieces_count: 3,
  created_at: new Date(Date.now() - 86_400_000).toISOString(),
  updated_at: new Date(Date.now() - 7_200_000).toISOString(),
};

describe("CampaignCard", () => {
  it("renders campaign name", () => {
    renderWithRouter(<CampaignCard campaign={campaign} />, { path: "/" });
    expect(screen.getByText("Spring Sale 2026")).toBeInTheDocument();
  });

  it("shows truncated brief", () => {
    renderWithRouter(<CampaignCard campaign={campaign} />, { path: "/" });
    expect(screen.getByText(/A very long brief/)).toBeInTheDocument();
  });

  it("shows content pieces count", () => {
    renderWithRouter(<CampaignCard campaign={campaign} />, { path: "/" });
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
  });

  it("shows source and target language badges", () => {
    renderWithRouter(<CampaignCard campaign={campaign} />, { path: "/" });
    expect(screen.getByText("en")).toBeInTheDocument();
    expect(screen.getByText("es")).toBeInTheDocument();
    expect(screen.getByText("fr")).toBeInTheDocument();
    expect(screen.getByText("de")).toBeInTheDocument();
  });

  it("links to the campaign detail page", () => {
    renderWithRouter(<CampaignCard campaign={campaign} />, { path: "/" });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/campaigns/c1");
  });

  it("shows relative updated time", () => {
    renderWithRouter(<CampaignCard campaign={campaign} />, { path: "/" });
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });
});
