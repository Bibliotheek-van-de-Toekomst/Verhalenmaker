import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verhaalmaker — de Bibliotheek",
  description: "Workshop creatief schrijven met een AI-coach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <div
          id="root"
          style={{ width: "100vw", height: "100dvh", minHeight: "100vh" }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
