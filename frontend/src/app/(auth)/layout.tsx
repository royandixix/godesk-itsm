import Link from "next/link";
import type { ReactNode } from "react";
import "./godesk-auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="ga-screen">
      <div className="ga-frame">
        <aside className="ga-info">
          <Link href="/login" className="ga-brand">
            <span className="ga-logo" aria-hidden="true">✚</span>
            <span>
              <strong>GoDesk</strong>
              <small>Helpdesk Platform</small>
            </span>
          </Link>

          <div className="ga-story">
            <div className="ga-label">● IT SERVICE MANAGEMENT</div>
            <h1>Kelola bantuan.<br /><em>Lebih terarah.</em></h1>
            <p>
              Satu platform untuk menangani tiket, memantau SLA,
              dan berbagi solusi layanan pelanggan.
            </p>

            <div className="ga-preview">
              <div className="ga-preview-top">
                <span>● ● ●</span> GoDesk Workspace
              </div>
              <div className="ga-feature">
                <b>01</b>
                <span>
                  <strong>Ticket Management</strong>
                  <small>Alur tiket yang terstruktur</small>
                </span>
              </div>
              <div className="ga-feature">
                <b>02</b>
                <span>
                  <strong>SLA Monitoring</strong>
                  <small>Target layanan terpantau</small>
                </span>
              </div>
              <div className="ga-feature">
                <b>03</b>
                <span>
                  <strong>Knowledge Base</strong>
                  <small>Panduan dan solusi terpusat</small>
                </span>
              </div>
            </div>
          </div>

          <small className="ga-info-footer">
            GoDesk • Support Management System
          </small>
        </aside>

        <section className="ga-panel">
          <div className="ga-mobile-brand">
            <span>✚</span> GoDesk
          </div>
          <p className="ga-panel-label">GODESK / SECURE ACCESS</p>
          <div className="ga-form">{children}</div>
          <p className="ga-foot">Akses aman ke layanan GoDesk</p>
        </section>
      </div>
    </main>
  );
}
