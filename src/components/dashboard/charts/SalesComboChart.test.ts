import { calcChange } from './SalesComboChart';

describe('SalesComboChart helpers', () => {
  test('전월값이 0이어도 현재값이 있으면 0%로 고정되지 않는다', () => {
    expect(calcChange(500000, 0)).toBe(100);
    expect(calcChange(3, 0)).toBe(100);
    expect(calcChange(0, 0)).toBe(0);
  });

  test('전월값 또는 전년값이 있으면 실제 차이로 퍼센트를 계산한다', () => {
    expect(calcChange(500000, 200000)).toBe(150);
    expect(calcChange(1300000, 1000000)).toBe(30);
  });

  test('0이 아닌 실제 매출 값은 축약 표시가 아니라 원본 값으로 사용할 수 있다', () => {
    expect(calcChange(48250000, 28500000)).toBe(69.3);
  });
});
