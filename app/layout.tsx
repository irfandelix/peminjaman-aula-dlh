import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Peminjaman Aula DLH Kabupaten Sragen",
  description: "Sistem Administrasi Peminjaman Ruang Aula Dinas Lingkungan Hidup Kabupaten Sragen.",
  icons: {
    icon: './public/auladlh.ico', // Pastikan kamu punya logo/icon kalau mau diganti
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}