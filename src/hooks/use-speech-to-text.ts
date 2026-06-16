import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

// Mobile browsers (especially iOS Safari & Chrome on Android) handle the
// Web Speech API differently from desktop:
//   - `continuous = true` is unreliable / unsupported on iOS — the session
//     ends after each utterance.
//   - Results are not cumulative across sessions, so we must keep our own
//     buffer of finalized text and append interim results on top.
//   - To keep "continuous" UX on mobile we restart recognition inside
//     `onend` while the user hasn't tapped stop.
// This hook implements that pattern so STT works consistently on mobile.
export function useSpeechToText(
  onResult?: (text: string) => void
): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalBufferRef = useRef<string>("");
  const shouldKeepListeningRef = useRef<boolean>(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    // iOS in particular ignores or breaks with continuous=true.
    recognition.continuous = !isMobile;
    recognition.interimResults = true;
    const savedLang =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("stt-language")
        : null;
    recognition.lang =
      savedLang ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = "";
      let newlyFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0].transcript;
        if (res.isFinal) {
          newlyFinal += text;
        } else {
          interim += text;
        }
      }
      if (newlyFinal) {
        finalBufferRef.current = (
          finalBufferRef.current +
          " " +
          newlyFinal
        ).trim();
      }
      const combined = (finalBufferRef.current + " " + interim).trim();
      setTranscript(combined);
      onResultRef.current?.(combined);
    };

    recognition.onerror = (event: any) => {
      // "no-speech" / "aborted" fire frequently on mobile — let onend
      // decide whether to restart; only stop on hard failures.
      if (
        event?.error === "not-allowed" ||
        event?.error === "service-not-allowed" ||
        event?.error === "audio-capture"
      ) {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or transient — stop cleanly.
          shouldKeepListeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [isMobile]);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    // Must run synchronously inside the user gesture for mobile permission.
    finalBufferRef.current = "";
    setTranscript("");
    shouldKeepListeningRef.current = true;
    const recognition = createRecognition();
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    }
  }, [isSupported, createRecognition]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, isSupported };
}
