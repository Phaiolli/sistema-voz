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
          background: "hsl(268, 62%, 36%)",
          borderRadius: "7px",
          position: "relative",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 20,
            fontWeight: 900,
            fontFamily: "Arial Black, Arial, sans-serif",
            letterSpacing: "-1px",
            lineHeight: 1,
          }}
        >
          v
        </span>
        <span
          style={{
            position: "absolute",
            bottom: 5,
            right: 5,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "hsl(44, 92%, 54%)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
