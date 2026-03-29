import '../styles/globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-light-background text-light-textPrimary dark:bg-dark-background dark:text-dark-textPrimary font-sans">
        {children}
      </body>
    </html>
  );
}