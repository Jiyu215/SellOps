import '../styles/globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-lightBackground text-lightTextPrimary dark:bg-darkBackground dark:text-darkTextPrimary font-sans">
        {children}
      </body>
    </html>
  );
}