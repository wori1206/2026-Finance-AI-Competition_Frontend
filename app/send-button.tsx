"use client";

import type { ButtonHTMLAttributes } from "react";

type SendButtonState = "default" | "loading" | "error" | "success";

type SendButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  state?: SendButtonState;
};

export function SendButton({ state = "default", disabled, ...props }: SendButtonProps) {
  const label = state === "loading" ? "메시지 전송 중" : state === "error" ? "메시지 다시 전송" : state === "success" ? "메시지 전송 완료" : "메시지 전송";

  return <button
    {...props}
    type="button"
    className={`send-circle ${props.className ?? ""}`.trim()}
    data-state={state}
    disabled={disabled || state === "loading"}
    aria-label={label}
    aria-busy={state === "loading" || undefined}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
    </svg>
  </button>;
}
