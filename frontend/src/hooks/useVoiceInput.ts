import { useState, useEffect, useRef, useCallback } from "react";

export interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

export function useVoiceInput(onFinalTranscript?: (text: string) => void): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      setIsSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after sentence to allow user review
        recognition.interimResults = true;
        recognition.lang = "en-IN"; // Default English (India) with fallback to en-US

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          if (event.results[event.results.length - 1].isFinal) {
            if (onFinalTranscript) {
              onFinalTranscript(currentTranscript);
            }
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setError("Microphone access denied. Please enable microphone permissions in your browser settings.");
          } else if (event.error === "no-speech") {
            setError("No speech detected. Please try speaking closer to the microphone.");
          } else {
            setError(`Voice recognition error: ${event.error || "Unknown error"}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err: any) {
        setIsSupported(false);
        setError("Speech recognition initialization failed.");
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [onFinalTranscript]);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported || !recognitionRef.current) {
      setError("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      setTranscript("");
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.name === "InvalidStateError") {
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        } catch (e) {
          setError("Failed to start voice input. Please try again.");
        }
      } else {
        setError("Could not activate microphone.");
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
  };
}
