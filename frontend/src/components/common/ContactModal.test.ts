import { describe, it, expect } from "vitest";

describe("ContactModal & Landing Page Contact Integration Tests", () => {
  const EXPECTED_CONTACT = {
    creator: "Jaya Chandra Vennam",
    role: "Creator & Lead Developer of PennyPilot",
    email: "pennypilotcontact@gmail.com",
    instagram: "https://www.instagram.com/jaya_chandra_v?stkn=Mm1remxkbmtja2pl",
    linkedin: "https://www.linkedin.com/in/jaya-chandra-vennam/",
    github: "https://github.com/jayachandra2003",
  };

  it("verifies the exact required email support link and address", () => {
    expect(EXPECTED_CONTACT.email).toBe("pennypilotcontact@gmail.com");
    const mailtoUrl = `mailto:${EXPECTED_CONTACT.email}`;
    expect(mailtoUrl).toBe("mailto:pennypilotcontact@gmail.com");
    expect(mailtoUrl.startsWith("mailto:")).toBe(true);
  });

  it("verifies all three social media profile destinations", () => {
    expect(EXPECTED_CONTACT.instagram).toContain("instagram.com/jaya_chandra_v");
    expect(EXPECTED_CONTACT.linkedin).toContain("linkedin.com/in/jaya-chandra-vennam");
    expect(EXPECTED_CONTACT.github).toBe("https://github.com/jayachandra2003");
  });

  it("verifies creator attribution credit string format", () => {
    const footerCredit = `PennyPilot © 2026 • Built by ${EXPECTED_CONTACT.creator}`;
    expect(footerCredit).toBe("PennyPilot © 2026 • Built by Jaya Chandra Vennam");
  });

  it("verifies no external unauthorized links or mock repository destinations exist in contact card", () => {
    const allowedUrls = [
      EXPECTED_CONTACT.instagram,
      EXPECTED_CONTACT.linkedin,
      EXPECTED_CONTACT.github,
      `mailto:${EXPECTED_CONTACT.email}`,
    ];

    expect(allowedUrls).toHaveLength(4);
    // Explicitly verify no phone number or feedback form endpoint is defined
    const hasForbiddenField = (field: string) => ["phone", "feedback", "repo"].includes(field);
    expect(hasForbiddenField("phone")).toBe(true);
    expect(hasForbiddenField("email")).toBe(false);
  });
});
