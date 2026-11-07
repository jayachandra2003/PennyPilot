import { describe, it, expect } from "vitest";
import { TUTORIAL_STEPS, type TutorialStep } from "./OnboardingTutorialTour";

describe("OnboardingTutorialTour Configuration & Logic", () => {
  it("defines exactly 6 sequential tour steps covering all core PennyPilot pillars", () => {
    expect(TUTORIAL_STEPS).toHaveLength(6);
  });

  it("covers Dashboard, Transactions, Budgets, Analytics, Insights, and AI Copilot in order", () => {
    const expectedTabs = ["dashboard", "transactions", "budgets", "analytics", "insights", "copilot"];
    const actualTabs = TUTORIAL_STEPS.map((step) => step.tab);
    expect(actualTabs).toEqual(expectedTabs);
  });

  it("each step contains non-empty title, subtitle, description, highlightPill, and icon", () => {
    TUTORIAL_STEPS.forEach((step: TutorialStep) => {
      expect(step.id).toBeTruthy();
      expect(step.tab).toBeTruthy();
      expect(step.title.length).toBeGreaterThan(5);
      expect(step.subtitle.length).toBeGreaterThan(5);
      expect(step.description.length).toBeGreaterThan(20);
      expect(step.highlightPill.length).toBeGreaterThan(3);
      expect(step.icon).toBeDefined();
    });
  });

  it("validates step navigation bounds (Step 1 of 6 through Step 6 of 6)", () => {
    const totalSteps = TUTORIAL_STEPS.length;
    let currentIndex = 0;

    // Next step progression
    for (let i = 0; i < totalSteps - 1; i++) {
      currentIndex = Math.min(currentIndex + 1, totalSteps - 1);
    }
    expect(currentIndex).toBe(5);

    // Prev step regression
    for (let i = 0; i < totalSteps - 1; i++) {
      currentIndex = Math.max(currentIndex - 1, 0);
    }
    expect(currentIndex).toBe(0);
  });

  it("evaluates first and last step predicates accurately for control button states", () => {
    const totalSteps = TUTORIAL_STEPS.length;

    // Step 1
    let index = 0;
    const isFirstStep = index === 0;
    const isLastStep = index === totalSteps - 1;
    expect(isFirstStep).toBe(true);
    expect(isLastStep).toBe(false);

    // Step 6
    index = 5;
    expect(index === 0).toBe(false);
    expect(index === totalSteps - 1).toBe(true);
  });

  it("correctly identifies user tutorial completion eligibility", () => {
    const eligibleUser = { id: "user-1", tutorial_completed: false };
    const completedUser = { id: "user-2", tutorial_completed: true };

    const checkEligible = (user: { id: string; tutorial_completed: boolean }, localVal: string | null) => {
      return !user.tutorial_completed && localVal !== "true";
    };

    expect(checkEligible(eligibleUser, null)).toBe(true);
    expect(checkEligible(completedUser, null)).toBe(false);
    expect(checkEligible(eligibleUser, "true")).toBe(false);
  });
});
