"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, User, Mail, Lock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { signUp, signIn } from "@/lib/auth-client";

interface Props {
  onAuthSuccess: (user: { id: string; name: string; email: string }) => void;
}

export function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "register") {
        const res = await signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        if (res.error) {
          setErrorMsg(res.error.message || "Registration failed. Please check your information.");
        } else if (res.data?.user) {
          onAuthSuccess({
            id: res.data.user.id,
            name: res.data.user.name || name.trim(),
            email: res.data.user.email || email.trim(),
          });
        }
      } else {
        const res = await signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });

        if (res.error) {
          setErrorMsg(res.error.message || "Invalid email or password.");
        } else if (res.data?.user) {
          onAuthSuccess({
            id: res.data.user.id,
            name: res.data.user.name || "Learner",
            email: res.data.user.email || email.trim(),
          });
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Try signing in with default test account
      const loginRes = await signIn.email({
        email: "alex.learner@glotty.ai",
        password: "Password123!",
      });

      if (loginRes.data?.user) {
        onAuthSuccess({
          id: loginRes.data.user.id,
          name: loginRes.data.user.name || "Alex Rivera",
          email: loginRes.data.user.email || "alex.learner@glotty.ai",
        });
        return;
      }

      // If not registered yet, create it
      const regRes = await signUp.email({
        name: "Alex Rivera",
        email: "alex.learner@glotty.ai",
        password: "Password123!",
      });

      if (regRes.data?.user) {
        onAuthSuccess({
          id: regRes.data.user.id,
          name: regRes.data.user.name || "Alex Rivera",
          email: regRes.data.user.email || "alex.learner@glotty.ai",
        });
      } else {
        // Fallback default
        onAuthSuccess({
          id: "usr_b1_learner_default",
          name: "Alex Rivera",
          email: "alex.learner@glotty.ai",
        });
      }
    } catch (err: any) {
      console.error("Demo login error:", err);
      // Fallback default for seamless demo
      onAuthSuccess({
        id: "usr_b1_learner_default",
        name: "Alex Rivera",
        email: "alex.learner@glotty.ai",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white overflow-y-auto">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center pt-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-xl shadow-indigo-200 mb-4">
          G
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Glotty</h1>
        <p className="text-xs text-indigo-600 font-semibold tracking-wide uppercase mt-1">
          A Language App for Smart People
        </p>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          The learner is the curriculum. Glotty observes silently and personalizes your learning path.
        </p>
      </div>

      {/* Auth Card */}
      <div className="my-auto py-6">
        {/* Toggle Mode */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign In
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Your Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (min 8 characters)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-medium">Starting Spanish Level:</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                B1 Intermediate
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === "register" ? "Register & Start Session 1" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo One-Tap */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
          <span className="text-[11px] text-slate-400">Want to test right away?</span>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quick Test as Alex Rivera (B1 Demo)</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-2">
        <p className="text-[11px] text-slate-400">
          Glotty never interrupts. Silent observation begins with Session 1.
        </p>
      </div>
    </div>
  );
}
