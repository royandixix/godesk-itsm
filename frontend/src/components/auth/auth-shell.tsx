"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  CheckCircle2,
  Headphones,
  MessageSquareText,
  TicketCheck,
} from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-svh w-full bg-[#efefec] p-2 sm:p-3 lg:p-4">
      <section className="mx-auto grid min-h-[calc(100svh-16px)] w-full max-w-[1680px] overflow-hidden rounded-[30px] bg-white shadow-[0_20px_80px_rgba(0,0,0,0.08)] sm:min-h-[calc(100svh-24px)] lg:min-h-[calc(100svh-32px)] lg:grid-cols-[0.94fr_1.06fr]">
        <div className="relative flex min-h-full flex-col bg-[#f8f8f6]">
          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 md:px-12 lg:px-14 xl:px-20">
            <div className="w-full max-w-[520px]">
              {children}
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-8 sm:pb-8 md:px-12 lg:px-14 xl:px-20">
            <div className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-4 rounded-[26px] border border-black/[0.04] bg-white px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.035)] sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex -space-x-2.5">
                  <div className="flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-[#1b1b1b] text-[11px] font-semibold text-white">
                    SA
                  </div>

                  <div className="flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-[#81cad9] text-[11px] font-semibold text-[#183941]">
                    AG
                  </div>

                  <div className="flex size-10 items-center justify-center rounded-full border-[3px] border-white bg-[#d8dbff] text-[11px] font-semibold text-[#31335b]">
                    CS
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium tracking-[-0.015em] text-[#242424]">
                    Built for support teams
                  </p>

                  <p className="mt-0.5 truncate text-[12px] text-[#9a9a96]">
                    Fast, organized and human.
                  </p>
                </div>
              </div>

              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#d9d9d5] bg-[#fafaf8]">
                <ArrowUpRight
                  className="size-5 text-[#252525]"
                  strokeWidth={1.6}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative hidden overflow-hidden bg-[#8ccbd7] lg:flex lg:p-3">
          <div className="relative flex min-h-full w-full overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#90d2de_0%,#7fc2d0_48%,#9acbd2_100%)]">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute -right-24 -top-20 size-[420px] rounded-full bg-white/20 blur-3xl" />
              <div className="absolute -bottom-40 -left-24 size-[440px] rounded-full bg-[#437a85]/25 blur-3xl" />
            </div>

            <div className="relative z-10 flex w-full flex-col px-9 py-10 xl:px-12 xl:py-12">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <p className="max-w-[570px] text-[30px] font-normal leading-[1.22] tracking-[-0.04em] text-white xl:text-[38px]">
                  Support conversations,
                  <br />
                  tickets and teams
                  <br />
                  in one place.
                </p>
              </motion.div>

              <div className="relative flex flex-1 items-center justify-center py-8">
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.92,
                    rotate: -4,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: -2,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative h-[360px] w-[480px] max-w-full xl:h-[430px] xl:w-[560px]"
                >
                  <div className="absolute left-[8%] top-[13%] h-[205px] w-[72%] rotate-[-7deg] rounded-[30px] border border-white/35 bg-white/20 shadow-[0_30px_70px_rgba(45,83,91,0.23)] backdrop-blur-xl">
                    <div className="flex h-full flex-col p-7">
                      <div className="flex items-center justify-between">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/75">
                          <Headphones
                            className="size-5 text-[#4c8995]"
                            strokeWidth={1.7}
                          />
                        </div>

                        <div className="rounded-full border border-white/40 bg-white/20 px-4 py-2 text-[11px] font-medium text-white">
                          Customer Support
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="h-3 w-[54%] rounded-full bg-white/80" />
                        <div className="mt-3 h-2.5 w-[78%] rounded-full bg-white/35" />
                        <div className="mt-2 h-2.5 w-[64%] rounded-full bg-white/30" />
                      </div>
                    </div>
                  </div>

                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute bottom-[13%] right-[4%] h-[190px] w-[67%] rotate-[7deg] rounded-[30px] border border-white/45 bg-[#f7f2e8] shadow-[0_35px_80px_rgba(38,77,84,0.26)]"
                  >
                    <div className="flex h-full flex-col p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-[#96938b]">
                            Ticket
                          </p>

                          <p className="mt-2 text-[18px] font-medium tracking-[-0.025em] text-[#292927]">
                            Payment issue
                          </p>
                        </div>

                        <div className="flex size-10 items-center justify-center rounded-full bg-[#d9f1e8]">
                          <CheckCircle2
                            className="size-5 text-[#467f68]"
                            strokeWidth={1.8}
                          />
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-[#252525]" />

                          <div>
                            <div className="h-2 w-16 rounded-full bg-[#b7b4ac]" />
                            <div className="mt-1.5 h-1.5 w-10 rounded-full bg-[#d4d1ca]" />
                          </div>
                        </div>

                        <span className="rounded-full bg-[#252525] px-3 py-1.5 text-[10px] font-medium text-white">
                          Resolved
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{
                      y: [0, 10, 0],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute right-[3%] top-[2%] flex size-[92px] rotate-[8deg] items-center justify-center rounded-[26px] border border-white/45 bg-white/30 shadow-xl backdrop-blur-xl"
                  >
                    <MessageSquareText
                      className="size-9 text-white"
                      strokeWidth={1.4}
                    />
                  </motion.div>

                  <motion.div
                    animate={{
                      x: [0, 7, 0],
                    }}
                    transition={{
                      duration: 5.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute bottom-[1%] left-[5%] flex size-[88px] rotate-[-8deg] items-center justify-center rounded-[26px] border border-white/45 bg-[#4f8e99]/55 shadow-xl backdrop-blur-xl"
                  >
                    <TicketCheck
                      className="size-9 text-white"
                      strokeWidth={1.5}
                    />
                  </motion.div>
                </motion.div>
              </div>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.25,
                }}
                className="rounded-[28px] border border-white/25 bg-[#5e8e96]/45 p-6 text-white shadow-[0_20px_50px_rgba(44,82,89,0.14)] backdrop-blur-xl xl:p-7"
              >
                <div className="flex items-center justify-between gap-5">
                  <div className="flex items-center">
                    <div className="size-10 rounded-full border border-white/80" />

                    <div className="-ml-2 flex h-10 min-w-[145px] items-center justify-center rounded-full border border-white/80 px-6 text-[13px] font-medium">
                      Stay organized
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex size-11 items-center justify-center rounded-full border border-white/40">
                      <ArrowUpRight
                        className="size-5 rotate-180 opacity-60"
                        strokeWidth={1.4}
                      />
                    </div>

                    <div className="flex size-11 items-center justify-center rounded-full border border-white/80">
                      <ArrowUpRight
                        className="size-5"
                        strokeWidth={1.4}
                      />
                    </div>
                  </div>
                </div>

                <p className="mt-6 max-w-[520px] text-[14px] leading-6 text-white/90">
                  Manage every request from first contact to final
                  resolution without losing the human touch.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}