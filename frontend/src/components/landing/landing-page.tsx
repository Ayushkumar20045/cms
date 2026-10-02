"use client";

import { useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import {
  RoleSelector,
  type UserRole,
} from "@/components/auth/role-selector";
import { CampusBackground } from "./campus-background";
import { FeatureList } from "./feature-list";
import { LandingFooter } from "./landing-footer";
import { UniversityBranding } from "./university-branding";

export function LandingPage() {
  const [role, setRole] = useState<UserRole>("student");

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100">
      {/* ==================================================
          CAMPUS BACKGROUND
          ================================================== */}
      <CampusBackground />

      {/* ==================================================
          NATURAL PAGE TRANSITION
          Keeps the photograph visible while gently
          brightening the area behind the login surface.
          ================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1]"
      >
        {/* Main soft atmospheric transition */}
        <div
          className="absolute inset-y-0 right-0 w-[48%]"
          style={{
            background:
              "radial-gradient(ellipse at 58% 50%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.11) 30%, rgba(255,255,255,0.035) 55%, transparent 76%)",
          }}
        />

        {/* Subtle warm GBU-toned atmosphere */}
        <div
          className="absolute right-[4%] top-[18%] h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(165,23,77,0.055) 0%, rgba(165,23,77,0.018) 42%, transparent 72%)",
          }}
        />

        {/* Very soft lower light */}
        <div
          className="absolute -bottom-40 right-[2%] h-[500px] w-[650px]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 45%, transparent 72%)",
          }}
        />
      </div>

      {/* ==================================================
          CONTENT
          ================================================== */}
      <div className="relative z-10 min-h-screen lg:flex">
        {/* =================================================
            LEFT — UNIVERSITY / CAMPUS
            ================================================= */}
        <section className="flex min-h-screen w-full flex-col px-7 py-7 sm:px-10 sm:py-8 lg:w-[58%] xl:px-14">
          <UniversityBranding />

          <div className="my-auto max-w-[620px] py-16">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
              University Digital Services
            </p>

            <h1 className="max-w-[570px] text-[2.55rem] font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-[3rem]">
              Complaint &amp; Grievance
              <br />
              Management System
            </h1>

            <p className="mt-5 max-w-[510px] text-[15px] leading-7 text-white/70">
              A centralized platform for students and hostel teams
              to submit, manage and track university complaints and
              service requests.
            </p>

            <div className="mt-8 max-w-xl">
              <FeatureList />
            </div>
          </div>

          <LandingFooter />
        </section>

        {/* =================================================
            RIGHT — LOGIN
            ================================================= */}
        <section className="relative flex min-h-screen w-full items-center px-5 py-10 sm:px-8 lg:w-[42%] lg:justify-center lg:px-8 xl:px-12">
          <div className="relative w-full max-w-[430px]">

            {/* Restrained glow directly around the card */}
            <div
              aria-hidden="true"
              className="absolute -inset-4 rounded-[38px] bg-white/25 blur-2xl"
            />

            {/* Login surface */}
            <div className="relative rounded-[30px] border border-white/80 bg-white/[0.93] p-6 shadow-[0_24px_65px_rgba(15,23,42,0.13)] backdrop-blur-[6px] sm:p-8">
              {/* Mobile branding */}
              <div className="mb-8 lg:hidden">
                <UniversityBranding compact />
              </div>

              {/* Header */}
              <div className="mb-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a5174d]">
                  Welcome Back
                </p>

                <h2 className="mt-2.5 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">
                  Sign in to your account
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Access the Complaint &amp; Grievance Management
                  System using your university credentials.
                </p>
              </div>

              {/* Account type */}
              <div className="mb-6">
                <RoleSelector
                  value={role}
                  onChange={setRole}
                />
              </div>

              {/* Authentication */}
              <LoginForm role={role} />

              {/* Secondary action */}
              {role === "student" ? (
                <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                  <p className="text-sm text-slate-500">
                    New student?
                    <button
                      type="button"
                      className="ml-1 font-semibold text-[#a5174d] transition-colors hover:text-[#8e123f]"
                    >
                      Register here
                    </button>
                  </p>
                </div>
              ) : (
                <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                  <p className="text-xs leading-5 text-slate-400">
                    {role === "staff"
                      ? "Hostel staff accounts are created by the university administration."
                      : "Administrator accounts are managed by the university administration."}
                  </p>
                </div>
              )}

              {/* Security note */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-3.5 w-3.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                  />

                  <path
                    d="M8 10V7a4 4 0 0 1 8 0v3"
                    strokeLinecap="round"
                  />
                </svg>

                <span>Authorized university services only</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}