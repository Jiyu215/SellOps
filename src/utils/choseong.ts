/**
 * 한글 초성(초성 자음) 기반 검색 유틸리티
 *
 * 한글 유니코드: 0xAC00(가) ~ 0xD7A3(힣)
 * 초성 수: 19개, 각 초성당 (중성 21 × 종성 28 = 588) 글자
 * 초성 인덱스 = Math.floor((code - 0xAC00) / 588)
 */

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const CHOSEONG_SET = new Set<string>(CHOSEONG);

/**
 * 문자열의 각 한글 글자를 초성으로 치환한 문자열 반환.
 * 한글 외 문자(영문, 숫자 등)는 그대로 유지.
 *
 * @example extractChoseong('김철수') → 'ㄱㅊㅅ'
 */
export const extractChoseong = (str: string): string =>
  [...str]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0xac00 && code <= 0xd7a3) {
        return CHOSEONG[Math.floor((code - 0xac00) / 588)];
      }
      return char;
    })
    .join('');

/**
 * 쿼리 문자열이 순수 초성(ㄱ~ㅎ)으로만 이루어졌는지 확인.
 * 빈 문자열은 false.
 */
const isChoseongOnly = (query: string): boolean =>
  query.length > 0 && [...query].every((c) => CHOSEONG_SET.has(c));

/**
 * 초성 검색을 포함한 한글 텍스트 매칭.
 *
 * - 쿼리가 초성(ㄱ~ㅎ)만 포함한 경우: 대상 텍스트를 초성으로 변환 후 포함 여부 확인
 * - 그 외: 대소문자 무시 includes 검사
 *
 * @example
 *   matchesKorean('김철수', 'ㄱ')   → true  (초성 ㄱ 포함)
 *   matchesKorean('김철수', 'ㄱㅊ') → true  (초성 ㄱ+ㅊ 연속)
 *   matchesKorean('김철수', '철')   → true  (일반 includes)
 *   matchesKorean('김철수', 'ㄴ')   → false
 */
export const matchesKorean = (text: string, query: string): boolean => {
  const q = query.trim();
  if (!q) return true;
  if (isChoseongOnly(q)) {
    return extractChoseong(text).includes(q);
  }
  return text.toLowerCase().includes(q.toLowerCase());
};
