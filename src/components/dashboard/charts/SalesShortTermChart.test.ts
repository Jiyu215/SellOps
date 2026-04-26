import { calcChange, formatOperationalChange } from './SalesShortTermChart';

describe('SalesShortTermChart helpers', () => {
  test('전일값이 0이고 현재값이 있으면 0%로 고정되지 않는다', () => {
    expect(calcChange(250000, 0)).toBe(100);
    expect(calcChange(5, 0)).toBe(100);
    expect(formatOperationalChange(250000, 0, null)).toBe('+100%');
    expect(formatOperationalChange(5, 0, null)).toBe('+100%');
  });

  test('전일값이 있으면 실제 차이로 퍼센트를 계산한다', () => {
    expect(calcChange(250000, 100000)).toBe(150);
    expect(calcChange(5, 2)).toBe(150);
    expect(formatOperationalChange(250000, 100000, null)).toBe('+150%');
    expect(formatOperationalChange(5, 2, null)).toBe('+150%');
  });
});
