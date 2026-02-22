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
            position: "relative",
            boxShadow: "0 25px 60px rgba(15,23,42,0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 86,
              left: 84,
              width: 74,
              height: 14,
              background: "#f8fafc",
              borderRadius: 999,
              transform: "rotate(-20deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 126,
              left: 92,
              width: 182,
              height: 94,
              border: "12px solid #f8fafc",
              borderRadius: 20,
              borderTopWidth: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 190,
              left: 102,
              width: 168,
              height: 10,
              background: "#f8fafc",
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 230,
              left: 124,
              width: 40,
              height: 40,
              border: "10px solid #f8fafc",
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 230,
              left: 216,
              width: 40,
              height: 40,
              border: "10px solid #f8fafc",
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
