"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  CircleHelp,
  LoaderCircle,
  Save,
  Send,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import TicketCombobox, {
  type TicketComboboxOption,
} from "@/features/tickets/components/ticket-combobox";

import {
  CategoryIcon,
  PriorityIcon,
} from "@/features/tickets/components/ticket-icons";

import {
  getCategories,
} from "@/features/tickets/api";

import {
  ApiError,
} from "@/lib/api/client";

import type {
  Category,
  TicketPriority,
} from "@/lib/types/ticket";

export type TicketFormValues = {
  category_id: number;
  subject: string;
  description: string;
  priority: TicketPriority;
};

type TicketFormProps = {
  mode: "create" | "edit";
  initialValues?: TicketFormValues;
  cancelHref: string;
  submitting: boolean;
  serverError?: string;
  onSubmit: (
    values: TicketFormValues,
  ) => Promise<void>;
};

const EMPTY_VALUES: TicketFormValues = {
  category_id: 0,
  subject: "",
  description: "",
  priority: "MEDIUM",
};

export default function TicketForm({
  mode,
  initialValues,
  cancelHref,
  submitting,
  serverError = "",
  onSubmit,
}: TicketFormProps) {
  const router =
    useRouter();

  const {
    language,
    t,
  } =
    useLanguage();

  const ui =
    language === "id"
      ? {
          categoryPlaceholder:
            "Cari atau pilih kategori...",
          categoryEmpty:
            "Kategori tidak ditemukan.",
          categoryHelp:
            "Pilih kategori yang paling sesuai dengan masalah.",
          subjectHelp:
            "Gunakan judul singkat dan mudah dipahami.",
          priorityPlaceholder:
            "Cari atau pilih prioritas...",
          priorityEmpty:
            "Prioritas tidak ditemukan.",
          priorityHelp:
            "Tentukan tingkat urgensi tiket.",
          descriptionHelp:
            "Jelaskan masalah secara lengkap agar mudah ditangani.",
          loadingCategories:
            "Memuat kategori...",
          save:
            "Simpan Perubahan",
          saving:
            "Menyimpan...",
          required:
            "Wajib",
          low:
            "Dapat mengikuti antrean penanganan normal.",
          medium:
            "Memerlukan perhatian dalam waktu normal.",
          high:
            "Masalah penting dan perlu diprioritaskan.",
          urgent:
            "Masalah kritis yang membutuhkan tindakan segera.",
        }
      : {
          categoryPlaceholder:
            "Search or select category...",
          categoryEmpty:
            "No category found.",
          categoryHelp:
            "Select the category that best matches the issue.",
          subjectHelp:
            "Use a short and easy-to-understand title.",
          priorityPlaceholder:
            "Search or select priority...",
          priorityEmpty:
            "No priority found.",
          priorityHelp:
            "Set the urgency level of this ticket.",
          descriptionHelp:
            "Describe the issue clearly so it can be handled efficiently.",
          loadingCategories:
            "Loading categories...",
          save:
            "Save Changes",
          saving:
            "Saving...",
          required:
            "Required",
          low:
            "Can follow the normal support queue.",
          medium:
            "Requires attention within normal response time.",
          high:
            "Important issue that should be prioritized.",
          urgent:
            "Critical issue requiring immediate action.",
        };

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      [],
    );

  const [
    loadingCategories,
    setLoadingCategories,
  ] =
    useState(true);

  const [
    categoryID,
    setCategoryID,
  ] =
    useState(
      String(
        initialValues
          ?.category_id ??
          EMPTY_VALUES
            .category_id,
      ),
    );

  const [
    subject,
    setSubject,
  ] =
    useState(
      initialValues
        ?.subject ??
        "",
    );

  const [
    description,
    setDescription,
  ] =
    useState(
      initialValues
        ?.description ??
        "",
    );

  const [
    priority,
    setPriority,
  ] =
    useState<TicketPriority>(
      initialValues
        ?.priority ??
        "MEDIUM",
    );

  const [
    validationError,
    setValidationError,
  ] =
    useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const response =
          await getCategories();

        setCategories(
          response.data,
        );

        if (
          !initialValues &&
          response.data.length >
            0
        ) {
          setCategoryID(
            String(
              response.data[0]
                .id,
            ),
          );
        }
      } catch (err) {
        if (
          err instanceof
            ApiError &&
          err.status ===
            401
        ) {
          router.replace(
            "/login",
          );

          return;
        }

        setValidationError(
          t(
            "newTicket.categoriesFailed",
          ),
        );
      } finally {
        setLoadingCategories(
          false,
        );
      }
    }

    void loadCategories();
  }, [
    initialValues,
    router,
    t,
  ]);

  const categoryOptions =
    useMemo<
      TicketComboboxOption[]
    >(
      () =>
        categories.map(
          (
            category,
          ) => {
            const key =
              `category.${category.slug}`;

            const translated =
              t(key);

            return {
              value:
                String(
                  category.id,
                ),

              label:
                translated ===
                key
                  ? category.name
                  : translated,

              description:
                getCategoryDescription(
                  category.slug,
                  language,
                ),

              icon:
                (
                  <CategoryIcon
                    slug={
                      category.slug
                    }
                  />
                ),
            };
          },
        ),
      [
        categories,
        language,
        t,
      ],
    );

  const priorityOptions =
    useMemo<
      TicketComboboxOption[]
    >(
      () => [
        {
          value:
            "LOW",

          label:
            t(
              "priority.LOW",
            ),

          description:
            ui.low,

          icon:
            (
              <PriorityIcon
                priority="LOW"
              />
            ),
        },
        {
          value:
            "MEDIUM",

          label:
            t(
              "priority.MEDIUM",
            ),

          description:
            ui.medium,

          icon:
            (
              <PriorityIcon
                priority="MEDIUM"
              />
            ),
        },
        {
          value:
            "HIGH",

          label:
            t(
              "priority.HIGH",
            ),

          description:
            ui.high,

          icon:
            (
              <PriorityIcon
                priority="HIGH"
              />
            ),
        },
        {
          value:
            "URGENT",

          label:
            t(
              "priority.URGENT",
            ),

          description:
            ui.urgent,

          icon:
            (
              <PriorityIcon
                priority="URGENT"
              />
            ),
        },
      ],
      [
        t,
        ui.low,
        ui.medium,
        ui.high,
        ui.urgent,
      ],
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setValidationError(
      "",
    );

    const parsedCategoryID =
      Number(
        categoryID,
      );

    if (
      !Number.isInteger(
        parsedCategoryID,
      ) ||
      parsedCategoryID <=
        0
    ) {
      setValidationError(
        t(
          "newTicket.categoryRequired",
        ),
      );

      return;
    }

    if (
      subject
        .trim()
        .length < 3
    ) {
      setValidationError(
        t(
          "newTicket.subjectMinimum",
        ),
      );

      return;
    }

    if (
      description
        .trim()
        .length < 5
    ) {
      setValidationError(
        t(
          "newTicket.descriptionMinimum",
        ),
      );

      return;
    }

    await onSubmit({
      category_id:
        parsedCategoryID,

      subject:
        subject.trim(),

      description:
        description.trim(),

      priority,
    });
  }

  const error =
    serverError ||
    validationError;

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#020617]"
    >
      <div className="space-y-7 p-6 sm:p-7">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <FieldLabel
            text={t(
              "newTicket.category",
            )}
            required={
              ui.required
            }
          />

          {loadingCategories ? (
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] text-slate-500 dark:border-slate-800 dark:bg-[#070c1b]">
              <LoaderCircle className="size-4 animate-spin" />

              {
                ui.loadingCategories
              }
            </div>
          ) : (
            <TicketCombobox
              value={
                categoryID
              }
              onValueChange={
                setCategoryID
              }
              options={
                categoryOptions
              }
              placeholder={
                ui.categoryPlaceholder
              }
              emptyText={
                ui.categoryEmpty
              }
              disabled={
                submitting
              }
            />
          )}

          <FieldHelp
            text={
              ui.categoryHelp
            }
          />
        </div>

        <div className="space-y-2">
          <FieldLabel
            text={t(
              "newTicket.subject",
            )}
            required={
              ui.required
            }
          />

          <Input
            id="ticket-subject"
            value={
              subject
            }
            onChange={(
              event,
            ) =>
              setSubject(
                event.target
                  .value,
              )
            }
            maxLength={
              200
            }
            disabled={
              submitting
            }
            placeholder={t(
              "newTicket.subjectPlaceholder",
            )}
            className="h-10 rounded-lg text-[12px]"
          />

          <div className="flex items-center justify-between gap-3">
            <FieldHelp
              text={
                ui.subjectHelp
              }
            />

            <span
              className={`shrink-0 text-[10px] font-medium ${
                subject.length >=
                180
                  ? "text-orange-500"
                  : "text-slate-400"
              }`}
            >
              {
                subject.length
              }
              /200
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel
            text={t(
              "newTicket.priority",
            )}
            required={
              ui.required
            }
          />

          <TicketCombobox
            value={
              priority
            }
            onValueChange={(
              value,
            ) => {
              if (
                value
              ) {
                setPriority(
                  value as TicketPriority,
                );
              }
            }}
            options={
              priorityOptions
            }
            placeholder={
              ui.priorityPlaceholder
            }
            emptyText={
              ui.priorityEmpty
            }
            disabled={
              submitting
            }
          />

          <FieldHelp
            text={
              ui.priorityHelp
            }
          />
        </div>

        <div className="space-y-2">
          <FieldLabel
            text={t(
              "newTicket.description",
            )}
            required={
              ui.required
            }
          />

          <textarea
            id="ticket-description"
            value={
              description
            }
            disabled={
              submitting
            }
            onChange={(
              event,
            ) =>
              setDescription(
                event.target
                  .value,
              )
            }
            rows={
              9
            }
            placeholder={t(
              "newTicket.descriptionPlaceholder",
            )}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-[12px] leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-[#070c1b] dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-800"
          />

          <FieldHelp
            text={
              ui.descriptionHelp
            }
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={
            cancelHref
          }
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-[#020617] dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          {t(
            "common.cancel",
          )}
        </Link>

        <Button
          type="submit"
          disabled={
            submitting ||
            loadingCategories
          }
          className="h-9 gap-2 rounded-lg px-4 text-[12px] font-semibold"
        >
          {submitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />

              {mode ===
              "create"
                ? t(
                    "newTicket.creating",
                  )
                : ui.saving}
            </>
          ) : mode ===
            "create" ? (
            <>
              <Send className="size-4" />

              {t(
                "newTicket.create",
              )}
            </>
          ) : (
            <>
              <Save className="size-4" />

              {
                ui.save
              }
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function FieldLabel({
  text,
  required,
}: {
  text: string;
  required: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
        {text}
      </Label>

      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        {required}
      </span>
    </div>
  );
}

function FieldHelp({
  text,
}: {
  text: string;
}) {
  return (
    <p className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-500">
      <CircleHelp className="mt-[1px] size-3 shrink-0" />

      <span>
        {text}
      </span>
    </p>
  );
}

function getCategoryDescription(
  slug: string,
  language:
    | "en"
    | "id",
) {
  const descriptions = {
    id: {
      "technical-issue":
        "Masalah sistem, aplikasi, perangkat atau teknis.",

      account:
        "Login, password, profil atau akses akun.",

      billing:
        "Pembayaran, invoice atau masalah tagihan.",

      "feature-request":
        "Saran atau permintaan fitur baru.",

      "general-support":
        "Pertanyaan umum atau bantuan lainnya.",
    },

    en: {
      "technical-issue":
        "System, application, device or technical issue.",

      account:
        "Login, password, profile or account access.",

      billing:
        "Payment, invoice or billing issue.",

      "feature-request":
        "Suggestion or request for a new feature.",

      "general-support":
        "General question or other support request.",
    },
  } as const;

  const selected =
    descriptions[
      language
    ];

  return (
    selected[
      slug as keyof typeof selected
    ] ??
    (language === "id"
      ? "Kategori bantuan tiket."
      : "Ticket support category.")
  );
}