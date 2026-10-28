"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LoaderCircle, RefreshCcw, UserCheck, UsersRound } from "lucide-react";

import { useRouter } from "next/navigation";

import Swal from "sweetalert2";

import { Button } from "@/components/ui/button";

import { assignTicket, getAgents } from "@/features/tickets/api";

import TicketCombobox, {
  type TicketComboboxOption,
} from "@/features/tickets/components/ticket-combobox";

import { ApiError } from "@/lib/api/client";

import {
  closeAlert,
  showError,
  showLoading,
  showSuccess,
} from "@/lib/sweet-alert";

import type { AgentSummary, Ticket } from "@/lib/types/ticket";

type Props = {
  ticket: Ticket;

  canAssign: boolean;

  disabled?: boolean;

  language: "id" | "en";

  onAssigned: (ticket: Ticket) => void;
};

export default function AgentAssignmentCard({
  ticket,
  canAssign,
  disabled = false,
  language,
  onAssigned,
}: Props) {
  const router = useRouter();

  const [agents, setAgents] = useState<AgentSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const [assigning, setAssigning] = useState(false);

  const [error, setError] = useState("");

  const [selectedAgent, setSelectedAgent] = useState(
    ticket.assigned_agent_id ? String(ticket.assigned_agent_id) : "",
  );

  const ui =
    language === "id"
      ? {
          title: "Penugasan Agent",

          description: "Pilih Agent aktif yang akan menangani tiket ini.",

          current: "Agent Saat Ini",

          notAssigned: "Belum ada Agent yang ditugaskan",

          select: "Cari atau pilih Agent...",

          empty: "Agent aktif tidak ditemukan.",

          assign: "Tugaskan Agent",

          assigning: "Menugaskan...",

          refresh: "Muat Ulang Agent",

          loadFailed: "Daftar Agent gagal dimuat.",

          confirmTitle: "Tugaskan Agent?",

          confirm: "Ya, Tugaskan",

          cancel: "Batal",

          loadingTitle: "Menugaskan Agent",

          loadingText:
            "Mohon tunggu. Penugasan Agent sedang disimpan pada sistem GoDesk.",

          successTitle: "Agent Berhasil Ditugaskan",

          failedTitle: "Gagal Menugaskan Agent",

          sameAgent: "Agent tersebut sudah ditugaskan pada tiket ini.",

          selectFirst: "Pilih Agent terlebih dahulu.",

          noAgents:
            "Belum ada akun Agent aktif. Buat atau aktifkan akun dengan role AGENT terlebih dahulu.",
        }
      : {
          title: "Agent Assignment",

          description: "Select an active Agent to handle this ticket.",

          current: "Current Agent",

          notAssigned: "No Agent assigned yet",

          select: "Search or select Agent...",

          empty: "No active Agent found.",

          assign: "Assign Agent",

          assigning: "Assigning...",

          refresh: "Refresh Agents",

          loadFailed: "Failed to load Agent list.",

          confirmTitle: "Assign Agent?",

          confirm: "Yes, Assign",

          cancel: "Cancel",

          loadingTitle: "Assigning Agent",

          loadingText:
            "Please wait. The Agent assignment is being saved to GoDesk.",

          successTitle: "Agent Assigned Successfully",

          failedTitle: "Failed to Assign Agent",

          sameAgent: "This Agent is already assigned to the ticket.",

          selectFirst: "Please select an Agent first.",

          noAgents:
            "There are no active Agent accounts yet. Create or activate an account with the AGENT role first.",
        };

  const [previousAssignedAgentId, setPreviousAssignedAgentId] =
    useState(ticket.assigned_agent_id);

  if (previousAssignedAgentId !== ticket.assigned_agent_id) {
    setPreviousAssignedAgentId(ticket.assigned_agent_id);
    setSelectedAgent(ticket.assigned_agent_id ? String(ticket.assigned_agent_id) : "");
  }

  const loadAgents = useCallback(async () => {
    if (!canAssign) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const response = await getAgents();

      setAgents(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");

          return;
        }

        setError(err.message);

        return;
      }

      setError(ui.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [canAssign, router, ui.loadFailed]);

  useEffect(() => {
    if (!canAssign) return;
    let active = true;
    void getAgents()
      .then((response) => {
        if (active) setAgents(response.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : ui.loadFailed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canAssign, router, ui.loadFailed]);

  function handleRefreshAgents() {
    setLoading(true);
    setError("");
    void loadAgents();
  }

  const agentOptions = useMemo<TicketComboboxOption[]>(
    () =>
      agents.map((agent) => ({
        value: String(agent.id),

        label: `${agent.name} — ${agent.email}`,

        icon: <UserCheck className="size-4" />,
      })),
    [agents],
  );

  const selectedAgentData = useMemo(
    () => agents.find((agent) => String(agent.id) === selectedAgent) ?? null,
    [agents, selectedAgent],
  );

  if (!canAssign) {
    return null;
  }

  async function handleAssign() {
    if (assigning || disabled) {
      return;
    }

    if (!selectedAgent) {
      await showError(ui.selectFirst, ui.failedTitle);

      return;
    }

    const agentID = Number(selectedAgent);

    if (!Number.isInteger(agentID) || agentID <= 0) {
      await showError(ui.selectFirst, ui.failedTitle);

      return;
    }

    if (ticket.assigned_agent_id === agentID) {
      await showError(ui.sameAgent, ui.failedTitle);

      return;
    }

    const agent = agents.find((item) => item.id === agentID);

    if (!agent) {
      await showError(ui.selectFirst, ui.failedTitle);

      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",

      title: ui.confirmTitle,

      text:
        language === "id"
          ? `Agent ${agent.name} (${agent.email}) akan ditugaskan untuk menangani tiket ${ticket.ticket_number} — ${ticket.subject}.`
          : `Agent ${agent.name} (${agent.email}) will be assigned to handle ticket ${ticket.ticket_number} — ${ticket.subject}.`,

      showCancelButton: true,

      confirmButtonText: ui.confirm,

      cancelButtonText: ui.cancel,

      reverseButtons: true,

      focusCancel: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      setAssigning(true);

      setError("");

      void showLoading(
        ui.loadingTitle,
        `${ui.loadingText} ${ticket.ticket_number}`,
      );

      const response = await assignTicket(ticket.id, {
        agent_id: agentID,
      });

      closeAlert();

      setSelectedAgent(
        response.data.assigned_agent_id
          ? String(response.data.assigned_agent_id)
          : "",
      );

      onAssigned(response.data);

      await showSuccess(
        language === "id"
          ? `${agent.name} berhasil ditugaskan untuk menangani tiket ${response.data.ticket_number}. Penugasan sudah tersimpan dan langsung aktif pada sistem GoDesk.`
          : `${agent.name} was successfully assigned to ticket ${response.data.ticket_number}. The assignment has been saved and is now active in GoDesk.`,

        ui.successTitle,
      );
    } catch (err) {
      closeAlert();

      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace("/login");

          return;
        }

        setError(err.message);

        await showError(err.message, ui.failedTitle);

        return;
      }

      setError(ui.loadFailed);

      await showError(ui.loadFailed, ui.failedTitle);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{ui.title}</h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {ui.description}
          </p>
        </div>

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900">
          <UsersRound className="size-4 text-slate-500" />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {ui.current}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {ticket.assigned_agent_name ?? ui.notAssigned}
        </p>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-5 text-xs text-slate-500 dark:border-slate-800">
          <LoaderCircle className="size-4 animate-spin" />

          {language === "id" ? "Memuat Agent..." : "Loading Agents..."}
        </div>
      ) : agents.length === 0 ? (
        <div className="mt-4">
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs leading-5 text-slate-500 dark:border-slate-700">
            {ui.noAgents}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            disabled={disabled}
            onClick={handleRefreshAgents}
          >
            <RefreshCcw className="size-4" />

            {ui.refresh}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <TicketCombobox
            value={selectedAgent}
            onValueChange={(value) => {
              setSelectedAgent(value);
            }}
            options={agentOptions}
            placeholder={ui.select}
            emptyText={ui.empty}
            disabled={disabled || assigning}
          />

          {selectedAgentData ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
              <p className="truncate text-xs font-semibold">
                {selectedAgentData.name}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                {selectedAgentData.email}
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={
              disabled ||
              assigning ||
              !selectedAgent ||
              Number(selectedAgent) === ticket.assigned_agent_id
            }
            onClick={() => void handleAssign()}
          >
            {assigning ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />

                {ui.assigning}
              </>
            ) : (
              <>
                <UserCheck className="size-4" />

                {ui.assign}
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
