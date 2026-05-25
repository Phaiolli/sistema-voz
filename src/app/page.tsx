import Link from "next/link";
import { VozWordmark } from "@/components/voz/wordmark";

export default function LandingPage() {
  return (
    <>
      {/* ── NAV ───────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "hsl(190 47% 14% / .92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 24 }}>
          <VozWordmark size={22} inverse />
          <div style={{ flex: 1 }} />
          <Link href="/entrar" style={navLinkStyle}>Entrar</Link>
          <Link href="/cadastro" style={ctaSmallStyle}>Criar conta grátis</Link>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(160deg, hsl(190 47% 14%) 0%, hsl(190 47% 20%) 100%)",
        color: "#fff",
        padding: "96px 24px 112px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative stripe */}
        <div aria-hidden style={{
          position: "absolute", bottom: 48, right: -60,
          width: 320, height: 10,
          background: "hsl(38 92% 50%)",
          transform: "rotate(-28deg)",
          opacity: .7,
        }} />

        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <span style={{
            display: "inline-block",
            padding: "4px 14px",
            borderRadius: 999,
            background: "hsl(38 92% 50% / .15)",
            color: "hsl(38 92% 65%)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: ".04em",
            marginBottom: 28,
          }}>
            Plataforma de perguntas ao vivo
          </span>

          <h1 style={{
            fontFamily: '"Archivo Black", sans-serif',
            fontWeight: 900,
            fontSize: "clamp(42px, 6vw, 80px)",
            lineHeight: .95,
            letterSpacing: "-0.03em",
            margin: "0 0 28px",
          }}>
            Sua plateia<br />
            tem voz<span style={{ color: "hsl(38 92% 50%)" }}>.</span>
          </h1>

          <p style={{
            fontSize: "clamp(17px, 2vw, 21px)",
            color: "rgba(255,255,255,.72)",
            lineHeight: 1.55,
            margin: "0 auto 44px",
            maxWidth: 540,
          }}>
            Colete perguntas da plateia em tempo real, modere com um clique e exiba no palco com elegância.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/cadastro" style={ctaPrimaryStyle}>
              Começar de graça
            </Link>
            <Link href="/entrar" style={ctaGhostStyle}>
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "hsl(var(--background))" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <SectionLabel>Como funciona</SectionLabel>
          <h2 style={sectionTitleStyle}>Em 3 passos, seu evento ao vivo</h2>

          <div style={gridStyle3}>
            <StepCard n={1} title="Crie sua conta">
              Cadastro gratuito em segundos. Sem cartão de crédito.
            </StepCard>
            <StepCard n={2} title="Monte seu evento">
              Configure nome, data, tema visual e link de acesso via QR code.
            </StepCard>
            <StepCard n={3} title="Receba perguntas">
              A plateia abre o celular, digita e você modera em tempo real no painel.
            </StepCard>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "hsl(var(--muted))" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <SectionLabel>Recursos</SectionLabel>
          <h2 style={sectionTitleStyle}>Tudo que você precisa no palco</h2>

          <div style={gridStyle2}>
            <FeatureCard icon="📱" title="Sem app para instalar">
              Participantes acessam pelo browser do celular via QR code ou link curto.
            </FeatureCard>
            <FeatureCard icon="⚡" title="Tempo real">
              Perguntas chegam ao painel instantaneamente, via WebSocket.
            </FeatureCard>
            <FeatureCard icon="🎛️" title="Moderação total">
              Aprove, destaque, oculte ou marque como respondida com atalhos de teclado.
            </FeatureCard>
            <FeatureCard icon="🖥️" title="Modo apresentação">
              Exiba a pergunta atual em tela cheia para o projetor, com fonte legível.
            </FeatureCard>
            <FeatureCard icon="🎨" title="Tema personalizado">
              Adapte cores, logo e tipografia ao visual do seu evento.
            </FeatureCard>
            <FeatureCard icon="📊" title="Exportar dados">
              Baixe perguntas e participantes em CSV ao final do evento.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "hsl(var(--background))" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <SectionLabel>Planos</SectionLabel>
          <h2 style={sectionTitleStyle}>Simples e transparente</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 40 }}>
            {/* Free */}
            <div style={planCardStyle}>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "hsl(var(--muted-foreground))", margin: "0 0 8px" }}>GRATUITO</p>
                <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 48, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                  R$&nbsp;0
                </p>
                <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: 0 }}>para sempre</p>
              </div>
              <ul style={featureListStyle}>
                <PlanFeature>1 evento</PlanFeature>
                <PlanFeature>Até 15 perguntas por evento</PlanFeature>
                <PlanFeature>QR code de acesso</PlanFeature>
                <PlanFeature>Painel de moderação</PlanFeature>
                <PlanFeature>Modo apresentação</PlanFeature>
              </ul>
              <Link href="/cadastro" style={{ ...ctaOutlineStyle, display: "block", textAlign: "center", marginTop: 32 }}>
                Começar grátis
              </Link>
            </div>

            {/* Per event */}
            <div style={{ ...planCardStyle, border: "2px solid hsl(var(--primary))", position: "relative" }}>
              <span style={{
                position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                background: "hsl(var(--primary))", color: "#fff",
                padding: "3px 16px", borderRadius: 999,
                fontSize: 12, fontWeight: 700, letterSpacing: ".06em",
                whiteSpace: "nowrap",
              }}>
                MAIS POPULAR
              </span>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "hsl(var(--muted-foreground))", margin: "0 0 8px" }}>POR EVENTO</p>
                <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 48, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
                  R$&nbsp;59<span style={{ fontSize: 28 }}>,90</span>
                </p>
                <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: 0 }}>pagamento único por evento</p>
              </div>
              <ul style={featureListStyle}>
                <PlanFeature>Eventos ilimitados</PlanFeature>
                <PlanFeature>Perguntas ilimitadas</PlanFeature>
                <PlanFeature>Tudo do plano gratuito</PlanFeature>
                <PlanFeature>Tema 100% personalizado</PlanFeature>
                <PlanFeature>Exportação CSV completa</PlanFeature>
                <PlanFeature>Inscrições e credenciamento</PlanFeature>
              </ul>
              <Link href="/cadastro" style={{ ...ctaPrimaryStyle, display: "block", textAlign: "center", marginTop: 32 }}>
                Criar conta e pagar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(160deg, hsl(190 47% 14%) 0%, hsl(190 47% 22%) 100%)",
        padding: "80px 24px",
        textAlign: "center",
        color: "#fff",
      }}>
        <h2 style={{
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: "clamp(32px, 4vw, 52px)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 16px",
        }}>
          Pronto para o próximo evento<span style={{ color: "hsl(38 92% 50%)" }}>?</span>
        </h2>
        <p style={{ color: "rgba(255,255,255,.65)", fontSize: 18, margin: "0 0 40px" }}>
          Cadastre-se agora e crie seu primeiro evento gratuitamente.
        </p>
        <Link href="/cadastro" style={ctaPrimaryStyle}>
          Criar conta grátis
        </Link>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{
        background: "hsl(190 47% 10%)",
        padding: "32px 24px",
        color: "rgba(255,255,255,.45)",
        fontSize: 13,
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <VozWordmark size={18} inverse />
          <span>Plataforma de perguntas ao vivo para eventos presenciais.</span>
          <div style={{ flex: 1 }} />
          <Link href="/entrar" style={{ color: "rgba(255,255,255,.45)", textDecoration: "none" }}>Entrar</Link>
          <Link href="/cadastro" style={{ color: "rgba(255,255,255,.45)", textDecoration: "none" }}>Cadastrar</Link>
        </div>
      </footer>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 13, fontWeight: 700, letterSpacing: ".1em",
      color: "hsl(var(--primary))", textTransform: "uppercase",
      margin: "0 0 12px",
    }}>
      {children}
    </p>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={cardBaseStyle}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "hsl(var(--primary))", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: '"Archivo Black", sans-serif', fontWeight: 900, fontSize: 18,
        marginBottom: 20,
      }}>
        {n}
      </div>
      <h3 style={cardTitleStyle}>{title}</h3>
      <p style={cardBodyStyle}>{children}</p>
    </div>
  );
}

function FeatureCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={cardBaseStyle}>
      <span style={{ fontSize: 28, marginBottom: 16, display: "block" }}>{icon}</span>
      <h3 style={cardTitleStyle}>{title}</h3>
      <p style={cardBodyStyle}>{children}</p>
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "hsl(var(--foreground))" }}>
      <span style={{ color: "hsl(var(--success))", flexShrink: 0, marginTop: 1 }}>✓</span>
      {children}
    </li>
  );
}

/* ── Style constants ────────────────────────────────────────────── */

const navLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,.7)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
};

const ctaSmallStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 36,
  padding: "0 16px",
  borderRadius: 8,
  background: "hsl(var(--primary))",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};

const ctaPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  padding: "0 32px",
  borderRadius: 12,
  background: "hsl(var(--primary))",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  textDecoration: "none",
  fontFamily: '"Archivo", sans-serif',
};

const ctaGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 52,
  padding: "0 32px",
  borderRadius: 12,
  background: "rgba(255,255,255,.1)",
  color: "#fff",
  fontSize: 16,
  fontWeight: 600,
  textDecoration: "none",
  border: "1.5px solid rgba(255,255,255,.2)",
};

const ctaOutlineStyle: React.CSSProperties = {
  height: 48,
  padding: "0 24px",
  borderRadius: 10,
  border: "1.5px solid hsl(var(--border))",
  background: "transparent",
  color: "hsl(var(--foreground))",
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: '"Archivo Black", sans-serif',
  fontWeight: 900,
  fontSize: "clamp(28px, 3.5vw, 44px)",
  letterSpacing: "-0.03em",
  margin: "0 0 40px",
  color: "hsl(var(--foreground))",
};

const gridStyle3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 20,
};

const gridStyle2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
};

const cardBaseStyle: React.CSSProperties = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 16,
  padding: "28px 24px",
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: '"Archivo", sans-serif',
  fontWeight: 700,
  fontSize: 17,
  margin: "0 0 8px",
  color: "hsl(var(--foreground))",
};

const cardBodyStyle: React.CSSProperties = {
  fontSize: 15,
  color: "hsl(var(--muted-foreground))",
  lineHeight: 1.55,
  margin: 0,
};

const planCardStyle: React.CSSProperties = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 20,
  padding: "36px 32px",
};

const featureListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
