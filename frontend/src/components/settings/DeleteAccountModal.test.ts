import { describe, it, expect } from "vitest";

describe("Permanent Account Deletion Validation Logic", () => {
  const REQUIRED_PHRASE = "DELETE MY ACCOUNT";

  function validateDeleteAccountSubmission(params: {
    confirmationPhrase: string;
    hasPassword: boolean;
    password?: string;
  }): { isValid: boolean; errorReason?: string } {
    if (params.confirmationPhrase !== REQUIRED_PHRASE) {
      return {
        isValid: false,
        errorReason: `Confirmation phrase must exactly match '${REQUIRED_PHRASE}'`,
      };
    }

    if (params.hasPassword && (!params.password || params.password.trim().length === 0)) {
      return {
        isValid: false,
        errorReason: "Password re-verification is required to authorize deletion",
      };
    }

    return { isValid: true };
  }

  it("requires exact case-sensitive phrase 'DELETE MY ACCOUNT'", () => {
    const validResult = validateDeleteAccountSubmission({
      confirmationPhrase: "DELETE MY ACCOUNT",
      hasPassword: true,
      password: "StrongPassword123!",
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.errorReason).toBeUndefined();
  });

  it("rejects lowercase variations ('delete my account')", () => {
    const result = validateDeleteAccountSubmission({
      confirmationPhrase: "delete my account",
      hasPassword: true,
      password: "StrongPassword123!",
    });
    expect(result.isValid).toBe(false);
    expect(result.errorReason).toContain(REQUIRED_PHRASE);
  });

  it("rejects partial or trailing-space variations", () => {
    const partial = validateDeleteAccountSubmission({
      confirmationPhrase: "DELETE MY",
      hasPassword: false,
    });
    expect(partial.isValid).toBe(false);

    const trailing = validateDeleteAccountSubmission({
      confirmationPhrase: "DELETE MY ACCOUNT ",
      hasPassword: false,
    });
    expect(trailing.isValid).toBe(false);
  });

  it("requires password when user has_password = true", () => {
    const noPassword = validateDeleteAccountSubmission({
      confirmationPhrase: "DELETE MY ACCOUNT",
      hasPassword: true,
      password: "",
    });
    expect(noPassword.isValid).toBe(false);
    expect(noPassword.errorReason).toContain("Password re-verification is required");
  });

  it("allows deletion without password for OAuth-only users (has_password = false)", () => {
    const oauthUser = validateDeleteAccountSubmission({
      confirmationPhrase: "DELETE MY ACCOUNT",
      hasPassword: false,
    });
    expect(oauthUser.isValid).toBe(true);
  });
});
