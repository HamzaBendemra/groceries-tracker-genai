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
            position: "relative",
            boxShadow: "0 10px 20px rgba(15,23,42,0.28)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 24,
              width: 25,
              height: 5,
              background: "#f8fafc",
              borderRadius: 999,
              transform: "rotate(-20deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 26,
              width: 62,
              height: 34,
              border: "5px solid #f8fafc",
              borderRadius: 8,
              borderTopWidth: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 62,
              left: 30,
              width: 54,
              height: 4,
              background: "#f8fafc",
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 80,
              left: 36,
              width: 14,
              height: 14,
              border: "4px solid #f8fafc",
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 80,
              left: 66,
              width: 14,
              height: 14,
              border: "4px solid #f8fafc",
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
