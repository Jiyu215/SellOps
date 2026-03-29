import { extractChoseong, matchesKorean } from './choseong';

// ── extractChoseong ───────────────────────────────────────────────────────────

describe('extractChoseong', () => {
  test('한글 문자열의 초성을 추출한다', () => {
    expect(extractChoseong('김철수')).toBe('ㄱㅊㅅ');
    expect(extractChoseong('홍길동')).toBe('ㅎㄱㄷ');
    expect(extractChoseong('가나다')).toBe('ㄱㄴㄷ');
  });

  test('영문·숫자는 그대로 유지한다', () => {
    expect(extractChoseong('abc123')).toBe('abc123');
  });

  test('한글과 영문 혼합 처리', () => {
    expect(extractChoseong('홍길동abc')).toBe('ㅎㄱㄷabc');
  });

  test('빈 문자열은 빈 문자열 반환', () => {
    expect(extractChoseong('')).toBe('');
  });

  test('이미 초성 자음만 있는 문자열 처리', () => {
    // ㄱ은 한글 완성자가 아니므로 그대로 반환
    expect(extractChoseong('ㄱㄴ')).toBe('ㄱㄴ');
  });
});

// ── matchesKorean ─────────────────────────────────────────────────────────────

describe('matchesKorean', () => {
  describe('초성 검색', () => {
    test('단일 초성으로 일치 여부 확인', () => {
      expect(matchesKorean('김철수', 'ㄱ')).toBe(true);
      expect(matchesKorean('김철수', 'ㄴ')).toBe(false);
    });

    test('여러 초성 연속 검색', () => {
      expect(matchesKorean('김철수', 'ㄱㅊ')).toBe(true);
      expect(matchesKorean('김철수', 'ㄱㅊㅅ')).toBe(true);
      expect(matchesKorean('김철수', 'ㄱㅎ')).toBe(false);
    });

    test('초성 검색은 중간 위치도 매칭', () => {
      expect(matchesKorean('홍길동', 'ㄱ')).toBe(true);   // 가운데 ㄱ
      expect(matchesKorean('홍길동', 'ㄱㄷ')).toBe(true); // ㄱ+ㄷ 연속
    });
  });

  describe('일반 텍스트 검색', () => {
    test('부분 문자열로 일치 여부 확인', () => {
      expect(matchesKorean('김철수', '철')).toBe(true);
      expect(matchesKorean('김철수', '철수')).toBe(true);
      expect(matchesKorean('김철수', '박')).toBe(false);
    });

    test('대소문자 무시 (영문)', () => {
      expect(matchesKorean('Kim', 'kim')).toBe(true);
      expect(matchesKorean('Kim', 'KIM')).toBe(true);
    });

    test('영문 포함 혼합 텍스트', () => {
      expect(matchesKorean('홍길동 Kim', 'kim')).toBe(true);
      expect(matchesKorean('홍길동 Kim', 'ㅎ')).toBe(true);
    });
  });

  describe('엣지 케이스', () => {
    test('빈 쿼리는 항상 true', () => {
      expect(matchesKorean('홍길동', '')).toBe(true);
      expect(matchesKorean('', '')).toBe(true);
    });

    test('공백만 있는 쿼리는 항상 true', () => {
      expect(matchesKorean('홍길동', '  ')).toBe(true);
    });

    test('대상이 빈 문자열인 경우', () => {
      expect(matchesKorean('', 'ㄱ')).toBe(false);
      expect(matchesKorean('', '가')).toBe(false);
    });
  });
});
