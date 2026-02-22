import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
          border: "18px solid #d6e2f5",
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 80,
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 25px 60px rgba(15,23,42,0.35)",
          }}
        >
          <div
            style={{
              color: "#f8fafc",
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateY(-4px)",
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
