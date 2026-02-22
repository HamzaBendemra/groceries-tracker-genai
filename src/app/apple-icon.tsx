import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 15%, #ffffff 0%, #e9f2ff 45%, #f7efe6 100%)",
          borderRadius: 42,
          border: "6px solid #d6e2f5",
        }}
      >
        <div
          style={{
            width: 122,
            height: 122,
            borderRadius: 28,
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 20px rgba(15,23,42,0.28)",
          }}
        >
          <div
            style={{
              color: "#f8fafc",
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateY(-1px)",
            }}
          >
            HC
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
