"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  Send,
  Sparkles,
  Brain,
  History,
  RefreshCw,
  Play,
  LogOut,
  ChevronDown,
  ChevronUp,
  MessageSquareQuote,
} from "lucide-react";
import { LearnerModelInspector } from "@/components/LearnerModelInspector";
import { PostSessionModal } from "@/components/PostSessionModal";
import { SessionHistoryModal } from "@/components/SessionHistoryModal";
import { AuthScreen } from "@/components/AuthScreen";
import { signOut, getSession } from "@/lib/auth-client";

interface ChatMessage {
  id: string;
  sender: "tutor" | "learner";
  text: string;
  timestamp: Date;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function Home() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [sessionGoal, setSessionGoal] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [learnerConcepts, setLearnerConcepts] = useState<Record<string, any>>({});

  // Mobile navigation drawers
  const [menuOpen, setMenuOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [testPromptsOpen, setTestPromptsOpen] = useState(false);

  // Debrief modal state
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [debriefSummary, setDebriefSummary] = useState("");
  const [nextSessionPreview, setNextSessionPreview] = useState("");
  const [surfacedInsights, setSurfacedInsights] = useState<any[]>([]);

  // Session history modal state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionsHistory, setSessionsHistory] = useState<any[]>([]);
  const [simulatingJourney, setSimulatingJourney] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Check initial authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const sessionData = await getSession();
        if (sessionData.data?.user) {
          const userObj = {
            id: sessionData.data.user.id,
            name: sessionData.data.user.name || "Alex Rivera",
            email: sessionData.data.user.email || "",
          };
          setCurrentUser(userObj);
          await startNewSession(userObj.id);
        }
      } catch (e) {
        console.error("Error checking session:", e);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    await startNewSession(user.id);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setCurrentUser(null);
    setSessionId(null);
    setMessages([]);
    setMenuOpen(false);
    setInspectorOpen(false);
  };

  const fetchSessionHistory = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/sessions/history?userId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (data.success) {
        setSessionsHistory(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to fetch session history:", e);
    }
  };

  const handleOpenHistory = async () => {
    setMenuOpen(false);
    await fetchSessionHistory();
    setHistoryOpen(true);
  };

  const handleSimulateJourney = async () => {
    if (!currentUser) return;
    setSimulatingJourney(true);
    try {
      const res = await fetch("/api/sessions/simulate-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLearnerState();
        await fetchSessionHistory();
        setMenuOpen(false);
        setHistoryOpen(true);
      }
    } catch (e) {
      console.error("Failed to simulate journey:", e);
    } finally {
      setSimulatingJourney(false);
    }
  };

  const fetchLearnerState = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/learner/state?userId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setLearnerConcepts(data.profile.concepts || {});
      }
    } catch (err) {
      console.error("Failed to fetch learner state:", err);
    }
  };

  const startNewSession = async (explicitUserId?: string) => {
    const uid = explicitUserId || currentUser?.id;
    if (!uid) return;

    setIsLoading(true);
    setDebriefOpen(false);
    setMenuOpen(false);
    setInspectorOpen(false);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setSessionNumber(data.sessionNumber);
        setSessionGoal(data.goal);

        // Add initial tutor greeting
        setMessages([
          {
            id: `msg_init_${Date.now()}`,
            sender: "tutor",
            text: data.initialPrompt,
            timestamp: new Date(),
          },
        ]);

        await fetchLearnerState();
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !sessionId || isLoading || !currentUser) return;

    const learnerMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "learner",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, learnerMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const lastTutorPrompt = [...messages]
        .reverse()
        .find((m) => m.sender === "tutor")?.text || "";

      const res = await fetch("/api/sessions/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId: currentUser.id,
          userMessage: text.trim(),
          currentPrompt: lastTutorPrompt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const tutorMsg: ChatMessage = {
          id: `msg_tutor_${Date.now()}`,
          sender: "tutor",
          text: data.reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, tutorMsg]);
        await fetchLearnerState();
      }
    } catch (err) {
      console.error("Failed to send turn:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!sessionId || !currentUser) return;
    setIsLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch("/api/sessions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDebriefSummary(data.debriefSummary);
        setNextSessionPreview(data.nextSessionPreview);
        setSurfacedInsights(data.surfacedInsights || []);
        setDebriefOpen(true);
        await fetchLearnerState();
      }
    } catch (err) {
      console.error("Failed to complete session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for initials
  const userInitials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "GL";

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center">
      {/* Mobile App Container Frame (Light Theme) */}
      <div className="w-full max-w-md h-[100dvh] bg-white flex flex-col relative overflow-hidden border-x border-slate-200 shadow-xl">
        
        {/* If user is not authenticated, show registration screen */}
        {!currentUser ? (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        ) : (
          <>
            {/* Mobile App Header */}
            <header className="border-b border-slate-200 bg-white/95 px-4 py-3 flex items-center justify-between backdrop-blur shrink-0 z-10">
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <h1 className="font-bold text-base tracking-tight text-slate-900">
                  Glotty
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Session {sessionNumber}</span>
                </div>
              </div>

              <button
                onClick={handleCompleteSession}
                disabled={isLoading || messages.length < 2}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
                title="End current session and review observations"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>End</span>
              </button>
            </header>

            {/* Main Window: ONLY Chat Messages */}
            <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-slate-50/70">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === "learner" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      m.sender === "learner"
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs font-serif text-[15px]"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(m.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}

              {/* Clean Typing Indicator */}
              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-500/80 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-500/80 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-500/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </main>

            {/* Clean Mobile Chat Input Bar */}
            <footer className="border-t border-slate-200 bg-white p-3 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:bg-white transition-colors">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribe en español..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none py-1 max-h-24"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !inputText.trim()}
                  className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-medium text-white flex items-center justify-center shrink-0 transition-colors shadow-sm shadow-indigo-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </footer>

            {/* Slide-out Mobile Menu Drawer */}
            {menuOpen && (
              <div className="fixed inset-0 z-50 flex">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                  onClick={() => setMenuOpen(false)}
                />

                {/* Side Drawer (Light Theme, Developer Studios Removed) */}
                <div className="relative w-[85%] max-w-xs bg-white border-r border-slate-200 h-full flex flex-col justify-between p-5 z-10 shadow-2xl text-slate-800">
                  {/* Drawer Top */}
                  <div className="flex flex-col gap-5 overflow-y-auto">
                    {/* Profile Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
                          {userInitials}
                        </div>
                        <div>
                          <h2 className="font-bold text-sm text-slate-900">{currentUser.name}</h2>
                          <p className="text-xs text-slate-500">B1 Spanish • Intermediate</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setMenuOpen(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Core Menu Options */}
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setInspectorOpen(true);
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-100 text-left transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:text-indigo-700">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">Your Spanish</div>
                          <div className="text-[11px] text-slate-500">Mastery & uncertainty profile</div>
                        </div>
                      </button>

                      <button
                        onClick={handleOpenHistory}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-100 text-left transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:text-sky-700">
                          <History className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">Session History</div>
                          <div className="text-[11px] text-slate-500">Past debriefs & turn counts</div>
                        </div>
                      </button>

                      <button
                        onClick={handleCompleteSession}
                        disabled={isLoading || messages.length < 2}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-100 text-left transition-colors group disabled:opacity-40"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:text-amber-700">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">End Session & Review</div>
                          <div className="text-[11px] text-slate-500">View what Glotty noticed</div>
                        </div>
                      </button>

                      <button
                        onClick={() => startNewSession()}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-100 text-left transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:text-emerald-700">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-800">New Session</div>
                          <div className="text-[11px] text-slate-500">Start fresh conversation</div>
                        </div>
                      </button>
                    </div>

                    {/* Quick Practice Trigger Accordion */}
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        onClick={() => setTestPromptsOpen(!testPromptsOpen)}
                        className="flex items-center justify-between w-full p-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                          Practice Samples (One-Tap)
                        </span>
                        {testPromptsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {testPromptsOpen && (
                        <div className="flex flex-col gap-2 mt-2 px-1">
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              handleSend("El año pasado fui a México y estaba muy interesante todo lo que vi.");
                            }}
                            className="text-left text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                          >
                            <span className="font-semibold block text-indigo-700 mb-0.5">Preterite/Imperfect</span>
                            "El año pasado fui a México y estaba muy interesante..."
                          </button>

                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              handleSend("Hice todo el trabajo para Carlos porque él estaba enfermo.");
                            }}
                            className="text-left text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                          >
                            <span className="font-semibold block text-indigo-700 mb-0.5">Por vs. Para</span>
                            "Hice todo el trabajo para Carlos porque él estaba enfermo."
                          </button>

                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              handleSend("Ayer iba al supermercado y compré leche cuando me encontré con Juan.");
                            }}
                            className="text-left text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
                          >
                            <span className="font-semibold block text-indigo-700 mb-0.5">Correct Aspect</span>
                            "Ayer iba al supermercado y compré leche..."
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Simulate Multi-Session Journey Button */}
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        onClick={handleSimulateJourney}
                        disabled={simulatingJourney}
                        className="flex items-center gap-2.5 w-full p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs text-purple-900 font-medium transition-colors disabled:opacity-50"
                      >
                        <Play className={`w-3.5 h-3.5 text-purple-600 ${simulatingJourney ? "animate-spin" : ""}`} />
                        <span>{simulatingJourney ? "Simulating 3 Sessions..." : "Fast-Forward 3 Sessions"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Drawer Bottom: Sign Out Button (Developer Studios completely removed) */}
                  <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col gap-3">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-slate-500" />
                      <span>Sign Out</span>
                    </button>
                    <div className="text-[10px] text-slate-400 text-center font-mono">
                      Glotty • Silent Observation
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Your Spanish: Slide-Over Drawer Sheet */}
            {inspectorOpen && (
              <div className="fixed inset-0 z-50 flex justify-end">
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                  onClick={() => setInspectorOpen(false)}
                />
                <div className="relative w-full max-w-md bg-white h-full z-10 shadow-2xl overflow-y-auto">
                  <LearnerModelInspector
                    concepts={learnerConcepts}
                    onClose={() => setInspectorOpen(false)}
                  />
                </div>
              </div>
            )}

            {/* Post-Session Debrief Modal */}
            <PostSessionModal
              isOpen={debriefOpen}
              sessionId={sessionId || ""}
              sessionNumber={sessionNumber}
              debriefSummary={debriefSummary}
              nextSessionPreview={nextSessionPreview}
              insights={surfacedInsights}
              onClose={() => setDebriefOpen(false)}
              onStartNextSession={() => startNewSession()}
            />

            {/* Session History Modal */}
            <SessionHistoryModal
              isOpen={historyOpen}
              onClose={() => setHistoryOpen(false)}
              sessions={sessionsHistory}
            />
          </>
        )}
      </div>
    </div>
  );
}
