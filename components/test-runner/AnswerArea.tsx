"use client";

import { useEffect, useState } from "react";
import { MathText } from "@/components/ui/Katex";
import type { ClientSafeQuestion } from "@/lib/types";

interface AnswerAreaProps {
  question: ClientSafeQuestion;
  initialResponse?: any;
  onAnswerChange: (response: any) => void;
  revealed?: boolean;
  feedback?: any;
}

export function AnswerArea({ question, initialResponse, onAnswerChange, revealed, feedback }: AnswerAreaProps) {
  switch (question.type) {
    case "single_mcq":
    case "fill_blank":
      return <SingleMCQ question={question} initialResponse={initialResponse} onAnswerChange={onAnswerChange} revealed={revealed} feedback={feedback} />;
    case "multi_mcq":
      return <MultiMCQ question={question} initialResponse={initialResponse} onAnswerChange={onAnswerChange} revealed={revealed} feedback={feedback} />;
    case "matching":
      return <Matching question={question} initialResponse={initialResponse} onAnswerChange={onAnswerChange} />;
    case "numeric":
      return <Numeric question={question} initialResponse={initialResponse} onAnswerChange={onAnswerChange} revealed={revealed} feedback={feedback} />;
    default:
      return <div className="text-ink-light">Unknown question type.</div>;
  }
}

function SingleMCQ({ question, initialResponse, onAnswerChange, revealed, feedback }: AnswerAreaProps) {
  const [selected, setSelected] = useState<string | undefined>(initialResponse?.optionId);
  useEffect(() => {
    setSelected(initialResponse?.optionId);
  }, [initialResponse?.optionId, question.id]);

  return (
    <div className="space-y-2 mt-4">
      {question.options?.map((opt, i) => {
        const isSelected = selected === opt.id;
        const showCorrect = revealed && feedback;
        const isCorrectOption = showCorrect && feedback.correctAnswer.includes(opt.content);
        return (
          <label
            key={opt.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
              isSelected ? "answer-row-selected border-quiz-blue" : "border-surface-border hover:bg-surface-panel"
            } ${isCorrectOption ? "bg-green-50 border-green-400" : ""}`}
          >
            <input
              type="radio"
              name={`q_${question.id}`}
              checked={isSelected}
              disabled={revealed}
              onChange={() => {
                setSelected(opt.id);
                onAnswerChange({ optionId: opt.id });
              }}
              className="h-4 w-4 text-quiz-blue"
            />
            <span className="text-ink">
              <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
              <MathText text={opt.content} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

function MultiMCQ({ question, initialResponse, onAnswerChange, revealed, feedback }: AnswerAreaProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialResponse?.optionIds || []));
  useEffect(() => {
    setChecked(new Set(initialResponse?.optionIds || []));
  }, [initialResponse?.optionIds, question.id]);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    onAnswerChange({ optionIds: Array.from(next) });
  };

  return (
    <div className="space-y-2 mt-4">
      {question.options?.map((opt, i) => {
        const isChecked = checked.has(opt.id);
        return (
          <label
            key={opt.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
              isChecked ? "answer-row-selected border-quiz-blue" : "border-surface-border hover:bg-surface-panel"
            }`}
          >
            <input
              type="checkbox"
              checked={isChecked}
              disabled={revealed}
              onChange={() => toggle(opt.id)}
              className="h-4 w-4 text-quiz-blue"
            />
            <span className="text-ink">
              <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
              <MathText text={opt.content} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

function Matching({ question, initialResponse, onAnswerChange }: AnswerAreaProps) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialResponse?.answers || {});
  useEffect(() => {
    setAnswers(initialResponse?.answers || {});
  }, [initialResponse?.answers, question.id]);

  const handleChange = (matchId: string, value: number) => {
    const next = { ...answers, [matchId]: value };
    setAnswers(next);
    onAnswerChange({ answers: next });
  };

  return (
    <div className="mt-4 flex flex-col gap-6 md:flex-row">
      {/* Left items with dropdowns */}
      <div className="flex-1 space-y-3">
        {question.matches?.map((match) => (
          <div key={match.id} className="flex items-center gap-3">
            <select
              value={answers[match.id] ?? ""}
              onChange={(e) => handleChange(match.id, Number(e.target.value))}
              className="w-16 rounded border border-surface-border px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Select</option>
              {question.matchChoices?.map((_, idx) => (
                <option key={idx} value={idx}>{idx + 1}</option>
              ))}
            </select>
            <span className="text-ink text-sm">
              <MathText text={match.leftContent} />
            </span>
          </div>
        ))}
      </div>
      {/* Right numbered legend */}
      <div className="md:w-64 space-y-2 md:border-l md:border-surface-border md:pl-6">
        <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">Choices</p>
        {question.matchChoices?.map((choice, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm text-ink">
            <span className="font-medium text-quiz-blue min-w-[1.5rem]">{idx + 1}.</span>
            <span><MathText text={choice} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Numeric({ question, initialResponse, onAnswerChange, revealed, feedback }: AnswerAreaProps) {
  const [value, setValue] = useState<string>(initialResponse?.value || "");
  useEffect(() => {
    setValue(initialResponse?.value || "");
  }, [initialResponse?.value, question.id]);

  return (
    <div className="mt-4">
      <input
        type="text"
        value={value}
        disabled={revealed}
        onChange={(e) => {
          setValue(e.target.value);
          onAnswerChange({ value: e.target.value });
        }}
        placeholder="Enter your answer"
        className="w-full max-w-xs rounded-lg border border-surface-border px-4 py-2.5 text-ink focus:border-quiz-blue"
      />
      {revealed && feedback && (
        <p className="mt-2 text-sm text-ink-soft">
          Correct answer: <span className="font-medium text-ink"><MathText text={feedback.correctAnswer} /></span>
        </p>
      )}
    </div>
  );
}
