import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "https://tiho-content-studio.openai.site";
  const title = "Тихо — контент-студия для массажиста";
  const description = "Создавайте готовые посты, сторис и сценарии рилс из одной идеи или фотографии.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ru_RU",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 909, alt: "Тихо — пост готов, можно выдохнуть" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
