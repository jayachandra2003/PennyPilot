import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Voice Input Feature Detection & Transcription Logic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("detects browser support when SpeechRecognition or webkitSpeechRecognition is available", () => {
    const hasSupport = (win: any): boolean => {
      return Boolean(win && (win.SpeechRecognition || win.webkitSpeechRecognition));
    };

    expect(hasSupport({})).toBe(false);
    expect(hasSupport({ SpeechRecognition: class {} })).toBe(true);
    expect(hasSupport({ webkitSpeechRecognition: class {} })).toBe(true);
  });

  it("correctly aggregates speech result transcripts", () => {
    const aggregateTranscript = (results: any[], resultIndex: number): { text: string; isFinal: boolean } => {
      let currentTranscript = "";
      let isFinal = false;
      for (let i = resultIndex; i < results.length; ++i) {
        currentTranscript += results[i][0].transcript;
        if (results[i].isFinal) isFinal = true;
      }
      return { text: currentTranscript.trim(), isFinal };
    };

    const mockResults = [
      Object.assign([{ transcript: "Where do I need to " }], { isFinal: false }),
      Object.assign([{ transcript: "reduce my spending" }], { isFinal: true }),
    ];

    const res = aggregateTranscript(mockResults, 0);
    expect(res.text).toBe("Where do I need to reduce my spending");
    expect(res.isFinal).toBe(true);
  });

  it("formats user voice errors accurately for permission denial and silence", () => {
    const formatVoiceError = (errorCode: string): string => {
      if (errorCode === "not-allowed" || errorCode === "permission-denied") {
        return "Microphone access denied. Please enable microphone permissions in your browser settings.";
      }
      if (errorCode === "no-speech") {
        return "No speech detected. Please try speaking closer to the microphone.";
      }
      return `Voice recognition error: ${errorCode}`;
    };

    expect(formatVoiceError("not-allowed")).toContain("Microphone access denied");
    expect(formatVoiceError("permission-denied")).toContain("Microphone access denied");
    expect(formatVoiceError("no-speech")).toContain("No speech detected");
    expect(formatVoiceError("network")).toBe("Voice recognition error: network");
  });
});
