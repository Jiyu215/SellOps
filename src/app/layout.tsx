import '../styles/globals.css';
import { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { lightColors, darkColors } from '../styles/theme/colors'; 
import { spacingPx, spacingRem } from '../styles/theme/spacing';
import { typography } from '../styles/theme/typography';
import { shadows } from '../styles/theme/shadows';
import { borders } from '../styles/theme/borders';

const theme = { lightColors, darkColors, spacingPx, spacingRem, typography, shadows, borders };

export default function RootLayout ({ children }: { children: ReactNode } ){
  return(
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}