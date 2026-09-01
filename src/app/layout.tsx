import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "KnowBody — โค้ชโภชนาการในไลน์",
  description:
    "ถ่ายรูปจานเดียว รู้พลังงาน โปรตีน คาร์บ ไขมัน ครบ พร้อมคำแนะนำ — โค้ชโภชนาการที่เข้าใจอาหารไทย",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${notoThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
