// px 기준 : 디자인 문서와 동일
export const spacingPx = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    huge: 96,
};

// px -> rem 변환 함수
export const pxToRem = (px: number) => `${px / 16}rem`;

// 웹 CSS 적용시 rem 변환
export const spacingRem = {
    xs: pxToRem(spacingPx.xs),
    sm: pxToRem(spacingPx.sm),
    md: pxToRem(spacingPx.md),
    lg: pxToRem(spacingPx.lg),
    xl: pxToRem(spacingPx.xl),
    xxl: pxToRem(spacingPx.xxl),
    xxxl: pxToRem(spacingPx.xxxl),
    huge: pxToRem(spacingPx.huge),
};