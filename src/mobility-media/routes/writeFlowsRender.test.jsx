/**
 * Rendered write flows, against a mocked API.
 *
 * These cover what unit tests cannot: that the right controls appear for the
 * right role, and that a completed action sends the body the API expects.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const authState = { user: { advertiserId: "ADV_1", portal: "advertiser", userId: "USR_1" }, permissions: [] };

vi.mock("@/mobility-media/auth/context", () => ({
  useAuth: () => ({ user: authState.user, session: authState.user, permissions: authState.permissions }),
  usePermission: () => ({
    permissions: authState.permissions,
    isAuthenticated: true,
    can: (permission) => authState.permissions.includes(permission),
    canAny: (required) => required.some((p) => authState.permissions.includes(p)),
    canEvery: (required) => required.every((p) => authState.permissions.includes(p)),
  }),
}));

const { default: ApiKeys } = await import("@/mobility-media/routes/ApiKeys");
const { CampaignActions } = await import("@/mobility-media/routes/CampaignActions");

const requests = [];
const server = setupServer(
  http.get("*/api/mobility/advertisers/ADV_1/api-keys", () =>
    HttpResponse.json({ data: { items: [{ keyId: "KEY_000000000000000001", label: "Old feed", trustLevel: "UNTRUSTED", createdAt: "2026-01-01T00:00:00Z", revokedAt: null, lastUsedAt: null }] }, correlationId: "c" }),
  ),
  http.post("*/api/mobility/advertisers/ADV_1/api-keys", async ({ request }) => {
    const body = await request.json();
    requests.push({ path: "issue", body });
    return HttpResponse.json({ data: { keyId: "KEY_000000000000000002", label: body.label, trustLevel: body.trustLevel, createdAt: "now", plaintext: "mmk_the-one-time-secret" }, correlationId: "c" }, { status: 201 });
  }),
  http.post("*/api/mobility/campaigns/CMP_1/state", async ({ request }) => {
    requests.push({ path: "state", body: await request.json() });
    return HttpResponse.json({ data: { id: "CMP_1", status: "PAUSED" }, correlationId: "c" }, { status: 201 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());

function renderWithClient(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("API keys", () => {
  it("issues an untrusted key and shows the plaintext once", async () => {
    authState.user = { advertiserId: "ADV_1", portal: "advertiser", userId: "USR_1" };
    authState.permissions = ["apikeys:manage"];
    const user = userEvent.setup();
    renderWithClient(<ApiKeys />);

    expect(await screen.findByText("Old feed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /new key/i }));
    // Advertisers cannot pick a trust level; only the explanation is shown.
    expect(screen.queryByLabelText(/trust level/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/label/i), "Shopify store");
    await user.click(screen.getByRole("button", { name: /create key/i }));

    expect(await screen.findByDisplayValue("mmk_the-one-time-secret")).toBeInTheDocument();
    expect(requests).toEqual([{ path: "issue", body: { label: "Shopify store", trustLevel: "UNTRUSTED" } }]);
  });
});

describe("campaign actions", () => {
  const running = { id: "CMP_1", name: "Monsoon run", status: "RUNNING", advertiserId: "ADV_1", budget: {} };

  it("offers only transitions the state machine allows, and pauses after confirming", async () => {
    authState.user = { advertiserId: "ADV_1", portal: "advertiser", userId: "USR_1" };
    authState.permissions = ["campaigns:write"];
    const user = userEvent.setup();
    renderWithClient(<CampaignActions campaign={running} />);

    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /pause/i }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /^pause$/i }));
    await waitFor(() => expect(requests).toEqual([{ path: "state", body: { state: "PAUSED" } }]));
  });

  it("shows nothing to a role without campaign write access", () => {
    authState.permissions = ["campaigns:read"];
    renderWithClient(<CampaignActions campaign={running} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

