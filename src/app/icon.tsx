import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(240, 80%, 58%)",
          borderRadius: "7px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: 900,
            fontFamily: "Arial Black, Arial, sans-serif",
            letterSpacing: "-1px",
            lineHeight: 1,
            marginTop: "1px",
          }}
        >
          V
        </span>
      </div>
    ),
    { ...size },
  );
}
