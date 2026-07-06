import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "voz. — Perguntas ao vivo para eventos presenciais";

/**
 * Default OpenGraph/Twitter card for shares of the marketing site. Uses the
 * brand purple/gold palette; mirrors the monogram in `icon.tsx`.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "96px",
        background:
          "linear-gradient(160deg, hsl(268, 45%, 12%) 0%, hsl(268, 45%, 22%) 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span
          style={{
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          voz
        </span>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "hsl(44, 92%, 54%)",
            marginLeft: 10,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 42,
          maxWidth: 900,
          lineHeight: 1.3,
          color: "rgba(255,255,255,.88)",
        }}
      >
        {SITE_DESCRIPTION}
      </div>
    </div>,
    { ...size },
  );
}
