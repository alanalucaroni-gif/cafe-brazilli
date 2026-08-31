import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Café Bazilli — Cold Brew sabor limão",
  description:
    "Experiência interativa do Cold Brew de Café Especial Café Bazilli, edição comemorativa de 20 anos.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
