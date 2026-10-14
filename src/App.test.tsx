import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [true, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));
import App from "./App";
import { initialState, STORAGE_KEY } from "./storage";
describe("baking screens", () => {
  it("updates displayed ingredients and the full recipe", async () => {
    const user = userEvent.setup();
    render(<App />);
    fireEvent.change(
      screen.getByLabelText("How much active starter do you have?"),
      { target: { value: "125" } },
    );
    expect(screen.getByText("362.5 g")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "See the full recipe" }),
    );
    expect(
      screen.getByText(/Mix 125 g active starter with 362.5 g warm water/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add 12.5 g salt/)).toBeInTheDocument();
  });
  it("blocks calculations with negative inputs", () => {
    render(<App />);
    fireEvent.change(
      screen.getByLabelText("How much active starter do you have?"),
      { target: { value: "-2" } },
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.queryByRole("button", { name: "Let’s bake" }),
    ).not.toBeInTheDocument();
  });
  it("saves a locked cooking session and restores the selected step", async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(screen.getByRole("button", { name: "Let’s bake" }));
    await user.click(screen.getByLabelText("I’ve completed this step"));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).sessions[0],
      ).toMatchObject({ current: 1, completed: ["feed"], locked: true }),
    );
    view.unmount();
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Starter, meet water" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Lock recipe amounts")).toBeChecked();
  });
  it("only changes an active recipe after unlocking", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...initialState,
        version: 1,
        session: { starter: 250, current: 0, completed: [], locked: true },
      }),
    );
    render(<App />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Continue baking" }));
    await user.click(screen.getByLabelText("Lock recipe amounts"));
    window.location.hash = "home";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(screen.getByRole("textbox")).toBeEnabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "150" } });
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).sessions[0].starter,
      ).toBe(150),
    );
  });
  it("shows storage failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage denied");
    });
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "couldn’t save changes",
    );
  });
});
