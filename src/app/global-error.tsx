"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f4f8f9", color: "#102f43", fontFamily: "Arial, sans-serif" }}>
        <main style={{ alignItems: "center", display: "flex", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
          <section
            role="alert"
            style={{
              background: "#ffffff",
              border: "1px solid #dbe7ec",
              borderRadius: 12,
              boxShadow: "0 18px 50px rgba(15, 23, 42, 0.10)",
              maxWidth: 500,
              padding: 40,
              textAlign: "center",
              width: "100%",
            }}
          >
            <div style={{ color: "#149bc8", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Evalora</div>
            <h1 style={{ color: "#0b2f45", fontSize: 28, margin: "16px 0 0" }}>Something went wrong</h1>
            <p style={{ color: "#557181", fontSize: 15, lineHeight: 1.6, margin: "14px 0 0" }}>
              We could not open Evalora right now. No internal error details were exposed. Please retry or reload the application.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 28 }}>
              <button
                onClick={reset}
                style={{ background: "#149bc8", border: 0, borderRadius: 7, color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700, minHeight: 44, padding: "0 20px" }}
                type="button"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ background: "white", border: "1px solid #cbdde4", borderRadius: 7, color: "#244b5e", cursor: "pointer", fontSize: 14, fontWeight: 700, minHeight: 44, padding: "0 20px" }}
                type="button"
              >
                Reload app
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
