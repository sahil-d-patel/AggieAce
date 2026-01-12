/**
 * Root Layout Component
 *
 * Provides the base HTML structure and global styles
 *
 * @module app/layout
 */

import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AggieAce - Syllabus Amplified, Life Simplified',
  description: 'Convert your course syllabus to a calendar file instantly. Texas A&M University.',
  keywords: 'TAMU, Texas A&M, syllabus, calendar, iCalendar, course management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-tamu-gray to-white">
          {children}
        </div>
      </body>
    </html>
  );
}
