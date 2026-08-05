import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AnimatedSection from "./components/AnimatedSection";
import CounterStats from "./components/CounterStats";

/* ──────── Icon Components ──────── */

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

function IconBlocks() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
    </svg>
  );
}

function IconFingerprint() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}

function IconQrCode() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
    </svg>
  );
}

function IconLink2() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}


/* ──────── Data ──────── */

const features = [
  {
    icon: <IconFileText />,
    title: "Unified Medical Records",
    desc: "One platform for all your reports, prescriptions, lab results, and medical history across every hospital and clinic.",
  },
  {
    icon: <IconBrain />,
    title: "AI Health Copilot",
    desc: "Ask questions about your health history in natural language. Get AI summaries, prescription explanations, and trend analysis.",
  },
  {
    icon: <IconBlocks />,
    title: "Blockchain Verification",
    desc: "Every document is SHA-256 hashed and anchored on-chain. Detect tampering instantly with cryptographic proof.",
  },
  {
    icon: <IconFingerprint />,
    title: "Patient-Controlled Consent",
    desc: "You decide who sees your records. Grant or revoke access to doctors and hospitals with blockchain-backed consent.",
  },
  {
    icon: <IconQrCode />,
    title: "Emergency Health QR",
    desc: "Generate a secure QR code with critical health data for emergency responders — allergies, conditions, medications.",
  },
  {
    icon: <IconShare />,
    title: "Secure Record Sharing",
    desc: "Share specific reports with doctors via signed, time-limited URLs. Full audit trail for every access.",
  },
];

const pipelineSteps = [
  { num: "01", label: "OCR Scan", desc: "Extract text from images" },
  { num: "02", label: "Entity Extract", desc: "Identify medical entities" },
  { num: "03", label: "Timeline Build", desc: "Chronological ordering" },
  { num: "04", label: "Health Summary", desc: "AI-generated overview" },
  { num: "05", label: "RAG Search", desc: "Semantic retrieval" },
  { num: "06", label: "AI Copilot", desc: "Conversational assistant" },
];

const contracts = [
  "PatientRegistry.sol",
  "HospitalRegistry.sol",
  "DoctorRegistry.sol",
  "ConsentManager.sol",
  "RecordRegistry.sol",
  "AuditTrail.sol",
  "PrescriptionVerification.sol",
];

const securityFeatures = [
  "AES-256 Encryption at Rest",
  "JWT Token Authentication",
  "Role-Based Access Control (RBAC)",
  "Attribute-Based Access Control",
  "SHA-256 Document Hashing",
  "Immutable Blockchain Audit Logs",
  "Signed & Time-Limited URLs",
  "Real-Time Activity Monitoring",
];

const howItWorks = [
  {
    step: 1,
    title: "Upload Records",
    desc: "Upload prescriptions, lab reports, discharge summaries — any medical document from any provider.",
    icon: <IconUpload />,
  },
  {
    step: 2,
    title: "AI Processes",
    desc: "Our AI pipeline extracts entities, builds timelines, generates summaries, and creates searchable embeddings.",
    icon: <IconCpu />,
  },
  {
    step: 3,
    title: "Blockchain Secures",
    desc: "Document hashes are anchored on Polygon. Consent records and audit trails are permanently stored on-chain.",
    icon: <IconLink2 />,
  },
  {
    step: 4,
    title: "You Control",
    desc: "Grant or revoke access, ask your AI copilot questions, share records securely, generate emergency QR codes.",
    icon: <IconUserCheck />,
  },
];

const stats = [
  { value: 2500000, suffix: "+", label: "Records Secured" },
  { value: 850000, suffix: "+", label: "AI Analyses Run" },
  { value: 1200000, suffix: "+", label: "Blockchain Verified" },
  { value: 99, suffix: ".99%", label: "Platform Uptime" },
];


/* ──────── Page ──────── */

export default function Home() {
  return (
    <div style={{ background: "var(--mv-bg-primary)", minHeight: "100vh" }}>
      <Navbar />

      {/* ────── HERO ────── */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          paddingTop: 72,
        }}
      >
        {/* Background Effects */}
        <div className="grid-pattern" />
        <div
          className="orb"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(14,116,144,0.25), transparent 70%)",
            top: "-10%",
            right: "-10%",
            animationDelay: "0s",
          }}
        />
        <div
          className="orb"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
            bottom: "-10%",
            left: "-5%",
            animationDelay: "4s",
          }}
        />
        <div
          className="orb"
          style={{
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)",
            top: "40%",
            left: "30%",
            animationDelay: "2s",
          }}
        />

        <div
          className="container-max"
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
            padding: "0 24px",
          }}
        >
          {/* Left: Text */}
          <div style={{ animation: "fadeInUp 1s ease forwards" }}>
            <div className="section-badge" style={{ marginBottom: 24 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              AI + Blockchain Healthcare
            </div>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                marginBottom: 24,
              }}
            >
              Your Health.
              <br />
              <span className="gradient-text">Your Data.</span>
              <br />
              Your Control.
            </h1>

            <p
              style={{
                fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
                color: "var(--mv-text-secondary)",
                lineHeight: 1.7,
                maxWidth: 520,
                marginBottom: 40,
              }}
            >
              MediVault Chain AI unifies your fragmented medical records into one
              intelligent platform. AI understands your health history.
              Blockchain guarantees its integrity. You own it all.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <a href="#" className="btn-primary" style={{ padding: "14px 32px" }}>
                Get Started Free
                <IconArrowRight />
              </a>
              <a href="#how-it-works" className="btn-ghost" style={{ padding: "14px 32px" }}>
                See How It Works
              </a>
            </div>

            {/* Trust badges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginTop: 48,
                flexWrap: "wrap",
              }}
            >
              {[
                { icon: <IconShield />, text: "HIPAA Aligned" },
                { icon: <IconBlocks />, text: "Polygon Verified" },
                { icon: <IconLock />, text: "AES-256 Encrypted" },
              ].map((badge, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--mv-text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                  }}
                >
                  <span style={{ color: "var(--mv-accent-emerald)", display: "flex" }}>{badge.icon}</span>
                  {badge.text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div
            style={{
              animation: "fadeInUp 1s ease 0.3s forwards",
              opacity: 0,
            }}
            className="hero-mockup-wrapper"
          >
            <div
              className="dashboard-mockup"
              style={{
                animation: "float-slow 8s ease-in-out infinite",
                boxShadow: "0 20px 80px rgba(0,0,0,0.5), 0 0 60px rgba(34,211,238,0.08)",
              }}
            >
              {/* Title Bar */}
              <div className="mockup-titlebar">
                <div className="mockup-dot" style={{ background: "#ef4444" }} />
                <div className="mockup-dot" style={{ background: "#f59e0b" }} />
                <div className="mockup-dot" style={{ background: "#22c55e" }} />
                <span style={{ marginLeft: 12, fontSize: "0.75rem", color: "var(--mv-text-muted)" }}>
                  MediVault — Patient Dashboard
                </span>
              </div>

              {/* Mockup Content */}
              <div style={{ padding: 20 }}>
                {/* Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Total Reports", value: "47", color: "#22d3ee" },
                    { label: "AI Insights", value: "128", color: "#10b981" },
                    { label: "Verified", value: "47/47", color: "#8b5cf6" },
                  ].map((card, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--mv-border)",
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ fontSize: "0.65rem", color: "var(--mv-text-muted)", marginBottom: 4 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: card.color }}>
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline Preview */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--mv-border)",
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: "0.7rem", color: "var(--mv-text-muted)", marginBottom: 10, fontWeight: 600 }}>
                    HEALTH TIMELINE
                  </div>
                  {[
                    { date: "Aug 2026", event: "Blood Test — CBC Panel", status: "Verified ✓" },
                    { date: "Jul 2026", event: "Cardiology Consultation", status: "Verified ✓" },
                    { date: "Jun 2026", event: "Chest X-Ray Report", status: "Verified ✓" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: i < 2 ? "1px solid var(--mv-border)" : "none",
                        fontSize: "0.72rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ color: "var(--mv-accent-cyan)", fontWeight: 600, minWidth: 65 }}>{item.date}</span>
                        <span style={{ color: "var(--mv-text-secondary)" }}>{item.event}</span>
                      </div>
                      <span style={{ color: "var(--mv-accent-emerald)", fontSize: "0.65rem", fontWeight: 600 }}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI Copilot Preview */}
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(34,211,238,0.05), rgba(139,92,246,0.05))",
                    border: "1px solid rgba(34,211,238,0.15)",
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: "linear-gradient(135deg, #0e7490, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    </div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--mv-accent-cyan)" }}>
                      AI COPILOT
                    </span>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--mv-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    &quot;Your recent CBC shows hemoglobin at 14.2 g/dL — within normal range. Compared to your March results, your platelet count has improved by 12%.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero responsive */}
        <style>{`
          @media (max-width: 900px) {
            .hero-mockup-wrapper { display: none !important; }
            section > .container-max { grid-template-columns: 1fr !important; text-align: center; }
            section > .container-max > div:first-child { align-items: center; display: flex; flex-direction: column; }
          }
        `}</style>
      </section>

      {/* ────── STATS BAR ────── */}
      <section
        style={{
          borderTop: "1px solid var(--mv-border)",
          borderBottom: "1px solid var(--mv-border)",
          background: "var(--mv-bg-secondary)",
        }}
      >
        <div className="container-max" style={{ padding: "0 24px" }}>
          <CounterStats stats={stats} />
        </div>
      </section>

      {/* ────── FEATURES ────── */}
      <section id="features" className="section-padding" style={{ position: "relative" }}>
        <div className="grid-pattern" />
        <div className="container-max" style={{ position: "relative", zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div className="section-badge" style={{ margin: "0 auto 20px" }}>
                <IconShield />
                Core Features
              </div>
              <h2 className="section-title" style={{ margin: "0 auto 16px" }}>
                Everything Your Health Data Needs
              </h2>
              <p className="section-subtitle" style={{ margin: "0 auto" }}>
                From intelligent AI analysis to immutable blockchain security — a complete
                platform built around patient ownership.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection stagger>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 24,
              }}
            >
              {features.map((f, i) => (
                <div key={i} className="glass-card" style={{ padding: 32 }}>
                  <div className="feature-icon" style={{ marginBottom: 20 }}>
                    {f.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      marginBottom: 10,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--mv-text-secondary)",
                      fontSize: "0.9rem",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ────── AI PIPELINE ────── */}
      <section
        id="ai-pipeline"
        className="section-padding"
        style={{ background: "var(--mv-bg-secondary)", position: "relative" }}
      >
        <div className="container-max" style={{ position: "relative", zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div className="section-badge" style={{ margin: "0 auto 20px" }}>
                <IconBrain />
                AI Engine
              </div>
              <h2 className="section-title" style={{ margin: "0 auto 16px" }}>
                Intelligence That{" "}
                <span className="gradient-text-static">Understands</span> Medicine
              </h2>
              <p className="section-subtitle" style={{ margin: "0 auto" }}>
                Our 6-stage AI pipeline transforms raw medical documents into structured
                knowledge, searchable history, and actionable insights.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection stagger>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 8,
                position: "relative",
              }}
              className="pipeline-grid"
            >
              {pipelineSteps.map((step, i) => (
                <div key={i} className="pipeline-step">
                  <div className="pipeline-dot">{step.num}</div>
                  {i < pipelineSteps.length - 1 && <div className="pipeline-connector" />}
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--mv-text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--mv-text-muted)",
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* AI Capability Cards */}
          <AnimatedSection delay={200}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 20,
                marginTop: 64,
              }}
            >
              {[
                { title: "Medical OCR", desc: "Extract text from scanned reports, prescriptions, and handwritten notes with PaddleOCR." },
                { title: "Entity Recognition", desc: "Identify diseases, medications, tests, doctors, and diagnoses from unstructured text." },
                { title: "Health Summaries", desc: "AI-generated patient overviews combining data from all uploaded records." },
                { title: "Drug Interactions", desc: "Automatically flag potential medication conflicts from prescription history." },
                { title: "Semantic Search", desc: "Query your records in natural language — 'Show my cholesterol trend over 2 years'." },
                { title: "RAG Copilot", desc: "Retrieval-Augmented Generation for accurate, context-aware health Q&A." },
              ].map((card, i) => (
                <div
                  key={i}
                  className="glass-card"
                  style={{ padding: "24px 28px" }}
                >
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      marginBottom: 8,
                      color: "var(--mv-accent-cyan)",
                    }}
                  >
                    {card.title}
                  </h4>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--mv-text-secondary)",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>

        {/* Pipeline responsive */}
        <style>{`
          @media (max-width: 768px) {
            .pipeline-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 24px !important;
            }
          }
          @media (max-width: 480px) {
            .pipeline-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}</style>
      </section>

      {/* ────── BLOCKCHAIN ────── */}
      <section id="blockchain" className="section-padding" style={{ position: "relative" }}>
        <div className="grid-pattern" />
        <div
          className="orb"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)",
            bottom: "10%",
            right: "5%",
          }}
        />
        <div className="container-max" style={{ position: "relative", zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div className="section-badge" style={{ margin: "0 auto 20px" }}>
                <IconBlocks />
                Blockchain Layer
              </div>
              <h2 className="section-title" style={{ margin: "0 auto 16px" }}>
                Trust Built on <span className="gradient-text-static">Immutable</span> Truth
              </h2>
              <p className="section-subtitle" style={{ margin: "0 auto" }}>
                Only cryptographic hashes and consent metadata go on-chain.
                Your medical files stay encrypted in secure storage — with verifiable proof of authenticity.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 40,
                alignItems: "start",
              }}
              className="blockchain-grid"
            >
              {/* Smart Contracts */}
              <div className="glass-card" style={{ padding: 32 }}>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "var(--mv-accent-violet)" }}>
                    <IconBlocks />
                  </span>
                  Smart Contract Architecture
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {contracts.map((c) => (
                    <div key={c} className="contract-item">
                      <span className="contract-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        </svg>
                      </span>
                      {c}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 20,
                    padding: "12px 16px",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    borderRadius: 8,
                    fontSize: "0.8rem",
                    color: "var(--mv-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "var(--mv-accent-violet)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </span>
                  Deployed on Polygon Amoy Testnet · Solidity + OpenZeppelin
                </div>
              </div>

              {/* Verification Flow */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  {
                    title: "Document Integrity",
                    desc: "SHA-256 hash of every uploaded document is stored on-chain. Any modification is instantly detectable.",
                    color: "var(--mv-accent-cyan)",
                  },
                  {
                    title: "Consent Management",
                    desc: "Patient grants are recorded as blockchain transactions. Full history of who accessed what, and when.",
                    color: "var(--mv-accent-emerald)",
                  },
                  {
                    title: "Audit Trail",
                    desc: "Every create, read, update, and share action generates an immutable log entry on-chain.",
                    color: "var(--mv-accent-violet)",
                  },
                  {
                    title: "Prescription Verification",
                    desc: "Doctors sign prescriptions digitally. Pharmacies verify authenticity against the blockchain.",
                    color: "var(--mv-accent-blue)",
                  },
                ].map((item, i) => (
                  <div key={i} className="glass-card" style={{ padding: "24px 28px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: item.color,
                          boxShadow: `0 0 12px ${item.color}`,
                        }}
                      />
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                        {item.title}
                      </h4>
                    </div>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--mv-text-secondary)",
                        lineHeight: 1.6,
                        margin: 0,
                        paddingLeft: 20,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .blockchain-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>

      {/* ────── SECURITY ────── */}
      <section
        id="security"
        className="section-padding"
        style={{ background: "var(--mv-bg-secondary)", position: "relative" }}
      >
        <div className="container-max" style={{ position: "relative", zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div className="section-badge" style={{ margin: "0 auto 20px" }}>
                <IconLock />
                Enterprise Security
              </div>
              <h2 className="section-title" style={{ margin: "0 auto 16px" }}>
                Security Is Not a Feature.{" "}
                <span className="gradient-text-static">It&apos;s the Foundation.</span>
              </h2>
              <p className="section-subtitle" style={{ margin: "0 auto" }}>
                Military-grade encryption, role-based access, and blockchain audit trails
                protect every byte of your medical data.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection stagger>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              {securityFeatures.map((feature) => (
                <div key={feature} className="security-item">
                  <span style={{ color: "var(--mv-accent-emerald)", display: "flex" }}>
                    <IconCheck />
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{feature}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ────── HOW IT WORKS ────── */}
      <section id="how-it-works" className="section-padding" style={{ position: "relative" }}>
        <div className="grid-pattern" />
        <div className="container-max" style={{ position: "relative", zIndex: 2 }}>
          <AnimatedSection>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div className="section-badge" style={{ margin: "0 auto 20px" }}>
                How It Works
              </div>
              <h2 className="section-title" style={{ margin: "0 auto 16px" }}>
                Four Steps to{" "}
                <span className="gradient-text-static">Complete</span> Control
              </h2>
              <p className="section-subtitle" style={{ margin: "0 auto" }}>
                From uploading your first document to asking your AI copilot complex
                health questions — it&apos;s designed to be effortless.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection stagger>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: 24,
              }}
            >
              {howItWorks.map((item) => (
                <div
                  key={item.step}
                  className="glass-card"
                  style={{
                    padding: 32,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div className="step-number">{item.step}</div>
                  <div style={{ color: "var(--mv-accent-cyan)", marginBottom: 16, display: "flex" }}>
                    {item.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      marginBottom: 10,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--mv-text-secondary)",
                      fontSize: "0.875rem",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ────── CTA BANNER ────── */}
      <section className="cta-banner" style={{ padding: "100px 24px", textAlign: "center" }}>
        <div className="container-narrow" style={{ position: "relative", zIndex: 2 }}>
          <AnimatedSection>
            <h2
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: 20,
              }}
            >
              Take Control of Your
              <br />
              Health Data Today
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "rgba(241,245,249,0.7)",
                maxWidth: 520,
                margin: "0 auto 40px",
                lineHeight: 1.7,
              }}
            >
              Join the future of healthcare. Your records, your intelligence,
              your security — all in one platform.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="#"
                className="btn-primary"
                style={{
                  padding: "16px 40px",
                  fontSize: "1rem",
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                Get Started Free
                <IconArrowRight />
              </a>
              <a
                href="#"
                className="btn-ghost"
                style={{
                  padding: "16px 40px",
                  fontSize: "1rem",
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "rgba(241,245,249,0.8)",
                }}
              >
                Schedule a Demo
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
