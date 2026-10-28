import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  Headphones,
  Lightbulb,
  Lock,
  Minus,
  TriangleAlert,
  UserRound,
  Wrench,
} from "lucide-react";

import type {
  TicketPriority,
  TicketStatus,
} from "@/lib/types/ticket";

export function CategoryIcon({
  slug,
  className = "size-4",
}: {
  slug: string;
  className?: string;
}) {
  switch (slug) {
    case "technical-issue":
      return (
        <Wrench
          className={className}
          strokeWidth={1.8}
        />
      );

    case "account":
      return (
        <UserRound
          className={className}
          strokeWidth={1.8}
        />
      );

    case "billing":
      return (
        <CreditCard
          className={className}
          strokeWidth={1.8}
        />
      );

    case "feature-request":
      return (
        <Lightbulb
          className={className}
          strokeWidth={1.8}
        />
      );

    case "general-support":
      return (
        <Headphones
          className={className}
          strokeWidth={1.8}
        />
      );

    default:
      return (
        <Headphones
          className={className}
          strokeWidth={1.8}
        />
      );
  }
}

export function PriorityIcon({
  priority,
  className = "size-4",
}: {
  priority: TicketPriority;
  className?: string;
}) {
  if (priority === "LOW") {
    return (
      <ArrowDown
        className={`${className} text-slate-400`}
        strokeWidth={1.9}
      />
    );
  }

  if (priority === "MEDIUM") {
    return (
      <Minus
        className={`${className} text-blue-500`}
        strokeWidth={2}
      />
    );
  }

  if (priority === "HIGH") {
    return (
      <ArrowUp
        className={`${className} text-orange-500`}
        strokeWidth={1.9}
      />
    );
  }

  return (
    <TriangleAlert
      className={`${className} text-red-500`}
      strokeWidth={1.9}
    />
  );
}

export function StatusIcon({
  status,
  className = "size-4",
}: {
  status: TicketStatus;
  className?: string;
}) {
  if (status === "OPEN") {
    return (
      <Circle
        className={`${className} text-blue-500`}
        strokeWidth={2}
      />
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <Clock3
        className={`${className} text-amber-500`}
        strokeWidth={1.9}
      />
    );
  }

  if (status === "RESOLVED") {
    return (
      <CheckCircle2
        className={`${className} text-emerald-500`}
        strokeWidth={1.9}
      />
    );
  }

  return (
    <Lock
      className={`${className} text-slate-500`}
      strokeWidth={1.9}
    />
  );
}