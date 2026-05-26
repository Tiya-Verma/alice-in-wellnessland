"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Goal {
  id: string;
  overview: string;
  strategies: string;
  acceptanceCriteria: string[];
  checkedCriteria: boolean[];
  completed: boolean;
  createdAt: string;
  streakDays: number;
  longestStreak: number;
  lastCheckInDate: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={key++}><em>{match[2]}</em></strong>);
    else if (match[3]) parts.push(<strong key={key++}>{match[3]}</strong>);
    else if (match[4]) parts.push(<em key={key++}>{match[4]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{...parts}</>;
}

export default function GoalsPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [formOverview, setFormOverview] = useState("");
  const [formStrategies, setFormStrategies] = useState("");
  const [formCriteria, setFormCriteria] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userLoaded) return;
    if (!userId) {
      setGoalsLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/goals?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.goals)) setGoals(data.goals);
      } catch (e) {
        console.error("Failed to load goals", e);
      } finally {
        setGoalsLoading(false);
      }
    })();
  }, [userId, userLoaded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (selectedGoal) {
      const updated = goals.find((g) => g.id === selectedGoal.id);
      if (updated) setSelectedGoal(updated);
    }
  }, [goals, selectedGoal]);

  const resetForm = () => {
    setFormOverview("");
    setFormStrategies("");
    setFormCriteria("");
    setFormError("");
  };

  const handleSubmitGoal = async () => {
    setFormError("");
    if (!userId) {
      setFormError("You need to be signed in to create goals.");
      return;
    }
    if (!formOverview.trim() || !formStrategies.trim() || !formCriteria.trim()) {
      setFormError("Please fill in all fields.");
      return;
    }

    const criteriaLines = formCriteria.split("\n").map((l) => l.trim()).filter(Boolean);
    if (criteriaLines.length === 0) {
      setFormError("Please enter at least one acceptance criterion.");
      return;
    }

    setFormLoading(true);
    try {
      const validateRes = await fetch("/api/goals/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overview: formOverview.trim(),
          strategies: formStrategies.trim(),
          criteriaLines,
        }),
      });

      const validation = await validateRes.json();

      if (!validateRes.ok) {
        setFormError(`Error: ${validation.error}`);
        setFormLoading(false);
        return;
      }

      if (!validation.isSmartGoal || !validation.isCriteriaSpecific) {
        setFormError(
          `Validation failed: ${validation.feedback} Please revise your goal to be SMART (Specific, Measurable, Achievable, Relevant, Time-bound) and ensure acceptance criteria are specific.`
        );
        setFormLoading(false);
        return;
      }

      const createRes = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          overview: formOverview.trim(),
          strategies: formStrategies.trim(),
          acceptanceCriteria: criteriaLines,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        setFormError(`Error saving goal: ${createData.error}`);
        setFormLoading(false);
        return;
      }

      setGoals((prev) => [createData.goal as Goal, ...prev]);
      resetForm();
      setView("list");
    } catch (e) {
      setFormError(`Error validating goal: ${(e as Error).message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleCriterion = async (goalId: string, idx: number) => {
    if (!userId) return;
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const nextChecked = [...goal.checkedCriteria];
    nextChecked[idx] = !nextChecked[idx];

    // Optimistic update for snappy UI.
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, checkedCriteria: nextChecked, completed: nextChecked.every(Boolean) }
          : g
      )
    );

    try {
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, goalId, checkedCriteria: nextChecked }),
      });
      const data = await res.json();
      if (res.ok && data.goal) {
        setGoals((prev) => prev.map((g) => (g.id === goalId ? (data.goal as Goal) : g)));
      }
    } catch (e) {
      console.error("Failed to update criterion", e);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!userId) return;
    const snapshot = goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (selectedGoal?.id === id) {
      setSelectedGoal(null);
      setView("list");
    }

    try {
      const res = await fetch(
        `/api/goals?userId=${encodeURIComponent(userId)}&goalId=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setGoals(snapshot);
      }
    } catch (e) {
      console.error("Failed to delete goal", e);
      setGoals(snapshot);
    }
  };

  const openGoalDetail = (goal: Goal) => {
    setSelectedGoal(goal);
    setView("detail");
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const goalsContext =
      goals.length > 0
        ? `Here are the user's current goals:\n\n${goals
            .map(
              (g, i) =>
                `Goal ${i + 1}: ${g.overview}\nStrategies: ${g.strategies}\nAcceptance Criteria: ${g.acceptanceCriteria.join("; ")}\nProgress: ${g.checkedCriteria.filter(Boolean).length}/${g.checkedCriteria.length} criteria met\nCurrent streak: ${g.streakDays} day(s)\nStatus: ${g.completed ? "Completed" : "In Progress"}`
            )
            .join("\n\n")}`
        : "The user has no goals set yet.";

    const userMsg: Message = { role: "user", content: chatInput };
    const newMessages: Message[] = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        text: m.content,
      }));

      const res = await fetch("/api/goals/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, goalsContext, userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setChatMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
        return;
      }

      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: `Sorry, I encountered an error: ${(e as Error).message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const finishedGoals = goals.filter((g) => g.completed);
  const overallStreak = goals.reduce((max, g) => Math.max(max, g.streakDays ?? 0), 0);

  return (
    <div className="min-h-screen">
      <a href="#goals-main" className="skip-link">Skip to goals</a>

      <main id="goals-main" className="max-w-2xl mx-auto px-6 py-16">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Goals</h1>
            <p className="mt-2 text-[color:var(--text-muted)]">
              Track your SMART goals and progress.
            </p>
            {overallStreak > 0 && (
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                <span aria-hidden>🔥</span>{" "}
                <span className="font-medium text-[color:var(--text)]">{overallStreak}-day streak</span>{" "}
                across your goals
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {view === "list" && (
              <button
                type="button"
                onClick={() => { resetForm(); setView("form"); }}
                className="min-h-[44px] px-4 py-2 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] transition-colors"
              >
                New goal
              </button>
            )}
            {view !== "list" && (
              <button
                type="button"
                onClick={() => setView("list")}
                className="text-sm underline underline-offset-4 hover:no-underline"
              >
                ← Back
              </button>
            )}
          </div>
        </header>

        {/* FORM VIEW */}
        {view === "form" && (
          <section
            aria-labelledby="form-heading"
            className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]"
          >
            <h2 id="form-heading" className="text-xl font-semibold">Create a new goal</h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Your goal will be validated to ensure it&apos;s SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="goal-overview" className="block text-sm font-medium mb-1.5">
                  Goal overview
                </label>
                <textarea
                  id="goal-overview"
                  value={formOverview}
                  onChange={(e) => setFormOverview(e.target.value)}
                  placeholder="e.g. Run a 5K in under 30 minutes by June 30, 2025, by training 3x per week."
                  rows={3}
                  className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus-visible:outline-3"
                />
              </div>

              <div>
                <label htmlFor="goal-strategies" className="block text-sm font-medium mb-1.5">
                  Strategies
                </label>
                <textarea
                  id="goal-strategies"
                  value={formStrategies}
                  onChange={(e) => setFormStrategies(e.target.value)}
                  placeholder="e.g. Follow a couch-to-5K training plan, run Mon/Wed/Fri mornings, track runs with Garmin app."
                  rows={3}
                  className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md px-3 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label htmlFor="goal-criteria" className="block text-sm font-medium mb-1.5">
                  Acceptance criteria
                </label>
                <p id="goal-criteria-help" className="text-xs text-[color:var(--text-muted)] mb-2">
                  Enter one criterion per line. These become checkboxes to track your completion.
                </p>
                <textarea
                  id="goal-criteria"
                  aria-describedby="goal-criteria-help"
                  value={formCriteria}
                  onChange={(e) => setFormCriteria(e.target.value)}
                  placeholder={`Complete at least 24 training runs\nFinish a 5K race officially timed\nAchieve a finish time under 30:00`}
                  rows={5}
                  className="w-full border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md px-3 py-2 text-sm resize-none"
                />
              </div>

              {formError && (
                <div
                  role="alert"
                  className="border border-[color:var(--danger)] rounded-md p-3 bg-[color:var(--surface-muted)]"
                >
                  <p className="text-sm text-[color:var(--danger)]">{formError}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSubmitGoal}
                  disabled={formLoading}
                  className="min-h-[44px] px-6 py-3 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {formLoading ? "Validating…" : "Submit goal"}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("list"); }}
                  className="min-h-[44px] px-4 py-3 text-sm underline underline-offset-4 hover:no-underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && selectedGoal && (
          <section
            aria-labelledby="detail-heading"
            className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--surface)]"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {selectedGoal.completed && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[color:var(--success)] text-[color:var(--success)]">
                      Completed
                    </span>
                  )}
                  <span className="text-xs text-[color:var(--text-muted)]">
                    Created {selectedGoal.createdAt}
                  </span>
                  {selectedGoal.streakDays > 0 && (
                    <span className="text-xs font-medium text-[color:var(--text)]">
                      <span aria-hidden>🔥</span> {selectedGoal.streakDays}-day streak
                      {selectedGoal.longestStreak > selectedGoal.streakDays && (
                        <span className="text-[color:var(--text-muted)] font-normal">
                          {" "}(best: {selectedGoal.longestStreak})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <h2 id="detail-heading" className="text-lg font-semibold">
                  {selectedGoal.overview}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => deleteGoal(selectedGoal.id)}
                className="text-sm text-[color:var(--danger)] underline underline-offset-4 hover:no-underline shrink-0"
              >
                Delete
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-medium mb-1">Strategies</h3>
              <p className="text-sm text-[color:var(--text-muted)] border border-[color:var(--border)] rounded-md p-3 bg-[color:var(--surface-muted)]">
                {selectedGoal.strategies}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">
                Acceptance criteria
                <span className="ml-2 text-[color:var(--text-muted)] font-normal">
                  ({selectedGoal.checkedCriteria.filter(Boolean).length}/{selectedGoal.checkedCriteria.length} met)
                </span>
              </h3>

              <div
                className="w-full bg-[color:var(--surface-muted)] rounded-full h-2 mb-4 overflow-hidden"
                role="progressbar"
                aria-valuenow={
                  selectedGoal.checkedCriteria.length > 0
                    ? Math.round(
                        (selectedGoal.checkedCriteria.filter(Boolean).length /
                          selectedGoal.checkedCriteria.length) *
                          100
                      )
                    : 0
                }
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="bg-[color:var(--accent)] h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      selectedGoal.checkedCriteria.length > 0
                        ? (selectedGoal.checkedCriteria.filter(Boolean).length /
                            selectedGoal.checkedCriteria.length) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <ul className="space-y-2 list-none">
                {selectedGoal.acceptanceCriteria.map((criterion, idx) => {
                  const checked = selectedGoal.checkedCriteria[idx] ?? false;
                  return (
                    <li key={idx}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCriterion(selectedGoal.id, idx)}
                          className="mt-1 h-4 w-4 cursor-pointer accent-[color:var(--accent)]"
                        />
                        <span className={`text-sm ${checked ? "line-through text-[color:var(--text-muted)]" : ""}`}>
                          {criterion}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="space-y-10">
            {goalsLoading ? (
              <p className="text-sm text-[color:var(--text-muted)]">Loading your goals…</p>
            ) : !userId ? (
              <p className="text-sm text-[color:var(--text-muted)]">Sign in to create and track goals.</p>
            ) : (
              <>
                <section aria-labelledby="active-heading">
                  <h2
                    id="active-heading"
                    className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)] mb-3"
                  >
                    Active goals ({activeGoals.length})
                  </h2>
                  {activeGoals.length === 0 ? (
                    <div className="border border-dashed border-[color:var(--border)] rounded-lg p-8 text-center bg-[color:var(--surface)]">
                      <p className="text-sm text-[color:var(--text-muted)]">
                        No active goals yet. Use <span className="font-medium text-[color:var(--text)]">New goal</span> above to create one.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3 list-none">
                      {activeGoals.map((goal) => {
                        const progress =
                          goal.checkedCriteria.length > 0
                            ? Math.round(
                                (goal.checkedCriteria.filter(Boolean).length /
                                  goal.checkedCriteria.length) *
                                  100
                              )
                            : 0;
                        return (
                          <li key={goal.id}>
                            <button
                              type="button"
                              onClick={() => openGoalDetail(goal)}
                              aria-label={`Open goal: ${goal.overview}. ${progress}% complete.`}
                              className="w-full text-left border border-[color:var(--border)] rounded-lg p-4 bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--border-strong)] transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{goal.overview}</p>
                                  <p className="text-xs text-[color:var(--text-muted)] mt-0.5">
                                    {goal.createdAt}
                                    {goal.streakDays > 0 && (
                                      <span className="ml-2">
                                        <span aria-hidden>🔥</span> {goal.streakDays}d
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <span className="text-sm font-medium shrink-0">{progress}%</span>
                              </div>
                              <div
                                className="mt-3 w-full bg-[color:var(--surface-muted)] rounded-full h-1.5 overflow-hidden"
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="bg-[color:var(--accent)] h-1.5 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <p className="text-xs text-[color:var(--text-muted)] mt-2">
                                {goal.checkedCriteria.filter(Boolean).length}/{goal.checkedCriteria.length} criteria met
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {finishedGoals.length > 0 && (
                  <section aria-labelledby="finished-heading">
                    <h2
                      id="finished-heading"
                      className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)] mb-3"
                    >
                      Completed goals ({finishedGoals.length})
                    </h2>
                    <ul className="space-y-3 list-none">
                      {finishedGoals.map((goal) => (
                        <li key={goal.id}>
                          <button
                            type="button"
                            onClick={() => openGoalDetail(goal)}
                            className="w-full text-left border border-[color:var(--border)] rounded-lg p-4 bg-[color:var(--surface-muted)] hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--border-strong)] transition-colors"
                          >
                            <p className="font-medium truncate">{goal.overview}</p>
                            <p className="text-xs text-[color:var(--text-muted)] mt-1">
                              {goal.createdAt} · All criteria met
                              {goal.longestStreak > 0 && (
                                <span className="ml-2">· Best streak {goal.longestStreak}d</span>
                              )}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Chat toggle button */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open goal coach chat"
          className="fixed bottom-6 right-6 px-4 py-3 rounded-full font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] shadow-md transition-colors z-50"
        >
          Goal coach
        </button>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <aside
          aria-label="Goal coach chat"
          className={`fixed z-50 border border-[color:var(--border)] bg-[color:var(--surface)] shadow-lg flex flex-col ${
            chatFullscreen
              ? "inset-0"
              : "bottom-6 right-6 w-80 sm:w-96 h-[520px] rounded-lg"
          }`}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)] shrink-0">
            <div>
              <p className="font-semibold">Goal coach</p>
              <p className="text-xs text-[color:var(--text-muted)]">Ask for advice on your goals</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChatFullscreen(!chatFullscreen)}
                aria-label={chatFullscreen ? "Minimize chat" : "Expand chat to full screen"}
                className="p-2 rounded hover:bg-[color:var(--surface-muted)]"
              >
                {chatFullscreen ? "⤡" : "⤢"}
              </button>
              <button
                type="button"
                onClick={() => { setChatOpen(false); setChatFullscreen(false); }}
                aria-label="Close chat"
                className="p-2 rounded hover:bg-[color:var(--surface-muted)]"
              >
                ✕
              </button>
            </div>
          </header>

          <div
            className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 ${
              chatFullscreen ? "max-w-3xl mx-auto w-full" : ""
            }`}
          >
            {chatMessages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-[color:var(--text-muted)]">
                  Hi! I can see your goals and help you improve them.
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    "How can I improve my current goal?",
                    "What resources would help me?",
                    "I'm struggling with motivation",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setChatInput(suggestion)}
                      className="block w-full text-left text-sm border border-[color:var(--border)] rounded-md px-3 py-2 hover:border-[color:var(--border-strong)] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
                      : "bg-[color:var(--surface-muted)] text-[color:var(--text)]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <div className="space-y-1">
                      {msg.content.split("\n").map((line, li) => {
                        if (!line.trim()) return <div key={li} className="h-1" />;
                        if (line.startsWith("### "))
                          return <p key={li} className="font-semibold mt-2">{renderInline(line.slice(4))}</p>;
                        if (line.startsWith("## "))
                          return <p key={li} className="font-bold mt-2">{renderInline(line.slice(3))}</p>;
                        if (line.match(/^\s*[\*\-]\s+/))
                          return (
                            <div key={li} className="flex gap-2 items-start">
                              <span aria-hidden className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                              <span>{renderInline(line.replace(/^\s*[\*\-]\s+/, ""))}</span>
                            </div>
                          );
                        return <p key={li}>{renderInline(line)}</p>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div role="status" aria-live="polite" className="flex justify-start">
                <div className="bg-[color:var(--surface-muted)] rounded-lg px-3 py-2">
                  <span className="text-sm text-[color:var(--text-muted)]">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div
            className={`px-4 py-3 border-t border-[color:var(--border)] shrink-0 ${
              chatFullscreen ? "max-w-3xl mx-auto w-full" : ""
            }`}
          >
            <form
              onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
              className="flex gap-2"
            >
              <label htmlFor="chat-input" className="sr-only">Ask about your goals</label>
              <input
                id="chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your goals…"
                className="flex-1 border border-[color:var(--border)] bg-[color:var(--bg)] rounded-md px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 rounded-md font-medium bg-[color:var(--accent)] text-[color:var(--accent-contrast)] hover:bg-[color:var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </aside>
      )}
    </div>
  );
}
