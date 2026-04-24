import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductDetailForm } from './ProductDetailForm';
import type { ProductDetail } from '@/types/products';

// ── next/navigation 모킹 ──────────────────────────────────────────────────────

const mockPush    = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, replace: mockReplace })),
}));

// ── next/image 모킹 ───────────────────────────────────────────────────────────

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// ── react-dom createPortal 모킹 ───────────────────────────────────────────────

jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// ── 서비스 모킹 ───────────────────────────────────────────────────────────────

jest.mock('@/services/productDetailService', () => ({
  checkProductCode: jest.fn().mockResolvedValue({ available: true }),
  adjustStock:      jest.fn().mockResolvedValue({ total: 210, sold: 1580, available: 152 }),
  getStockHistory:  jest.fn().mockResolvedValue({
    items: [
      { id: 'sh-001', type: 'in', quantity: 100, reason: '초기 입고', operator: '김운영', createdAt: '2024-01-15T14:30:00.000Z' },
    ],
    total: 1,
  }),
}));

// ── 서버 액션 모킹 ────────────────────────────────────────────────────────────

jest.mock('@/app/actions/products', () => ({
  saveProductAction: jest.fn().mockResolvedValue({ id: 'prod-new', product: undefined }),
}));

// ── localStorage 모킹 ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── clipboard 모킹 ────────────────────────────────────────────────────────────

Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

// ── 목 상품 데이터 ────────────────────────────────────────────────────────────

const MOCK_PRODUCT: ProductDetail = {
  id:               'prod-001',
  productCode:      'KB-MXS-BLK',
  name:             'MX Keys S 키보드 블랙',
  category:         '키보드',
  price:            139000,
  summary:          '로지텍 MX Keys S 키보드입니다.',
  shortDescription: '스마트 백라이트 키보드',
  description:      '<p>상세 설명입니다.</p>',
  status:           'active',
  stock:            { total: 200, sold: 1580, available: 142 },
  images:           [],
  createdAt:        '2024-01-15T00:00:00.000Z',
  updatedAt:        '2024-01-25T00:00:00.000Z',
  createdBy:        '김운영',
};

// ── 헬퍼: 헤더의 버튼 (duplicate 방지) ───────────────────────────────────────

/** 같은 aria-label을 가진 버튼이 여러 개(header + mobile)일 때 첫 번째(헤더 버튼) 반환 */
function getFirstBtn(name: RegExp | string) {
  return screen.getAllByRole('button', { name })[0];
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  localStorageMock.clear();
  jest.clearAllMocks();
  // 서비스 모킹 재설정
  const service = jest.requireMock('@/services/productDetailService');
  service.checkProductCode.mockResolvedValue({ available: true });
  service.adjustStock.mockResolvedValue({ total: 210, sold: 1580, available: 152 });
  service.getStockHistory.mockResolvedValue({
    items: [
      { id: 'sh-001', type: 'in', quantity: 100, reason: '초기 입고', operator: '김운영', createdAt: '2024-01-15T14:30:00.000Z' },
    ],
    total: 1,
  });
  // 서버 액션 모킹 재설정
  const actions = jest.requireMock('@/app/actions/products');
  actions.saveProductAction.mockResolvedValue({ id: 'prod-new', product: undefined });
});

// ── 렌더링 ────────────────────────────────────────────────────────────────────

describe('렌더링', () => {
  test('신규 등록 모드: "새 상품 등록" 타이틀 표시', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText('새 상품 등록')).toBeInTheDocument();
  });

  test('수정 모드: 상품명이 타이틀에 표시됨', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    expect(screen.getByText('MX Keys S 키보드 블랙')).toBeInTheDocument();
  });

  test('기본 정보 섹션이 렌더링됨', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText('기본 정보')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('상품명을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('예: PRD-ABC123')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
  });

  test('상품 설명 섹션이 렌더링됨', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText('상품 설명')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('요약 설명을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('간단 설명을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/상품 상세 설명을 입력해주세요/)).toBeInTheDocument();
  });

  test('이미지 관리 섹션이 렌더링됨', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText('이미지 관리')).toBeInTheDocument();
    expect(screen.getByLabelText('대표 이미지 업로드')).toBeInTheDocument();
    expect(screen.getByLabelText('목록 이미지 업로드')).toBeInTheDocument();
  });

  test('상품 상태 섹션이 렌더링됨', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText('상품 상태')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /판매중/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /숨김/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /품절/ })).toBeInTheDocument();
  });

  test('수정 모드에서 재고 관리 섹션이 렌더링됨', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    expect(screen.getByText('재고 관리')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();  // 가용 재고
  });

  test('신규 등록 모드에서도 재고 관리 섹션 표시됨', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText('재고 관리')).toBeInTheDocument();
    expect(screen.getByText('초기 입고 수량을 미리 설정할 수 있습니다. 설정하지 않으면 재고 0으로 등록됩니다.')).toBeInTheDocument();
  });

  test('신규 등록 모드에서 재고 이력 섹션 미표시', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.queryByRole('button', { name: /재고 이력 보기/ })).not.toBeInTheDocument();
  });

  test('수정 모드에서 저장 정보 섹션이 렌더링됨', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    expect(screen.getByText('정보')).toBeInTheDocument();
    expect(screen.getByText('prod-001')).toBeInTheDocument();
    expect(screen.getByText('김운영')).toBeInTheDocument();
  });

  test('수정 모드에서 기존 값이 폼에 채워짐', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    expect(screen.getByDisplayValue('MX Keys S 키보드 블랙')).toBeInTheDocument();
    expect(screen.getByDisplayValue('KB-MXS-BLK')).toBeInTheDocument();
    expect(screen.getByDisplayValue('139000')).toBeInTheDocument();
  });

  test('신규 모드에서 자동 코드 생성 버튼 표시', () => {
    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText(/코드 자동 생성/)).toBeInTheDocument();
  });

  test('수정 모드에서 자동 코드 생성 버튼 미표시', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    expect(screen.queryByText(/코드 자동 생성/)).not.toBeInTheDocument();
  });
});

// ── 폼 유효성 검사 ────────────────────────────────────────────────────────────

describe('폼 유효성 검사', () => {
  test('상품명 미입력 시 에러 메시지 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    const input = screen.getByPlaceholderText('상품명을 입력해주세요.');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText('상품명을 입력해주세요.')).toBeInTheDocument();
    });
  });

  test('판매가 미입력 시 에러 메시지 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    const input = screen.getByPlaceholderText('0');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText('올바른 금액을 입력해주세요.')).toBeInTheDocument();
    });
  });

  test('상품코드 미입력 시 에러 메시지 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    const input = screen.getByPlaceholderText('예: PRD-ABC123');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText('상품코드를 입력해주세요.')).toBeInTheDocument();
    });
  });

  test('잘못된 형식의 상품코드 에러 메시지 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    const input = screen.getByPlaceholderText('예: PRD-ABC123');
    await userEvent.type(input, 'invalid code!');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText('상품코드는 영문, 숫자, 하이픈만 사용 가능합니다.')).toBeInTheDocument();
    });
  });

  test('에러 상태에서 입력 시 에러 메시지 실시간 해제', async () => {
    render(<ProductDetailForm isNew={true} />);
    const nameInput = screen.getByPlaceholderText('상품명을 입력해주세요.');
    fireEvent.blur(nameInput);
    await waitFor(() => {
      expect(screen.getByText('상품명을 입력해주세요.')).toBeInTheDocument();
    });
    await userEvent.type(nameInput, '새 상품');
    await waitFor(() => {
      expect(screen.queryByText('상품명을 입력해주세요.')).not.toBeInTheDocument();
    });
  });

  test('저장 클릭 시 중복확인 미완료면 에러 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    // 상품명 입력
    await userEvent.type(screen.getByPlaceholderText('상품명을 입력해주세요.'), '테스트 상품');
    // 코드 입력 (중복확인 안 함)
    await userEvent.type(screen.getByPlaceholderText('예: PRD-ABC123'), 'TEST-001');
    // 가격 입력
    await userEvent.type(screen.getByPlaceholderText('0'), '10000');
    // 저장 (헤더 버튼)
    fireEvent.click(getFirstBtn('저장하기'));
    await waitFor(() => {
      expect(screen.getByText('상품코드 중복 확인을 완료해주세요.')).toBeInTheDocument();
    });
  });
});

// ── 상품코드 중복 확인 ────────────────────────────────────────────────────────

describe('상품코드 중복 확인', () => {
  test('사용 가능한 코드 확인 시 성공 메시지 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    const codeInput = screen.getByPlaceholderText('예: PRD-ABC123');
    await userEvent.type(codeInput, 'NEW-CODE-001');
    const checkBtn = screen.getByRole('button', { name: '상품코드 중복 확인' });
    fireEvent.click(checkBtn);
    await waitFor(() => {
      expect(screen.getByText('사용 가능한 코드입니다.')).toBeInTheDocument();
    });
  });

  test('중복 코드 확인 시 에러 메시지 표시', async () => {
    const service = jest.requireMock('@/services/productDetailService');
    service.checkProductCode.mockResolvedValue({ available: false });

    render(<ProductDetailForm isNew={true} />);
    const codeInput = screen.getByPlaceholderText('예: PRD-ABC123');
    await userEvent.type(codeInput, 'KB-MXS-BLK');
    const checkBtn = screen.getByRole('button', { name: '상품코드 중복 확인' });
    fireEvent.click(checkBtn);
    await waitFor(() => {
      expect(screen.getByText('이미 사용 중인 상품코드입니다.')).toBeInTheDocument();
    });
  });

  test('코드 변경 시 확인 상태 초기화', async () => {
    render(<ProductDetailForm isNew={true} />);
    const codeInput = screen.getByPlaceholderText('예: PRD-ABC123');
    await userEvent.type(codeInput, 'NEW-001');
    const checkBtn = screen.getByRole('button', { name: '상품코드 중복 확인' });
    fireEvent.click(checkBtn);
    await waitFor(() => {
      expect(screen.getByText('사용 가능한 코드입니다.')).toBeInTheDocument();
    });
    // 코드 변경
    await userEvent.type(codeInput, '-MODIFIED');
    expect(screen.queryByText('사용 가능한 코드입니다.')).not.toBeInTheDocument();
  });

  test('코드 자동 생성 버튼이 코드를 채움', async () => {
    render(<ProductDetailForm isNew={true} />);
    const autoBtn = screen.getByText(/코드 자동 생성/);
    fireEvent.click(autoBtn);
    const codeInput = screen.getByPlaceholderText('예: PRD-ABC123') as HTMLInputElement;
    await waitFor(() => {
      expect(codeInput.value.startsWith('PRD-')).toBe(true);
    });
  });
});

// ── 상품 상태 ─────────────────────────────────────────────────────────────────

describe('상품 상태', () => {
  test('기본 상태는 판매중', () => {
    render(<ProductDetailForm isNew={true} />);
    const activeRadio = screen.getByRole('radio', { name: /판매중/ });
    expect(activeRadio).toBeChecked();
  });

  test('숨김 선택 시 체크됨', async () => {
    render(<ProductDetailForm isNew={true} />);
    const hiddenRadio = screen.getByRole('radio', { name: /숨김/ });
    fireEvent.click(hiddenRadio);
    await waitFor(() => {
      expect(hiddenRadio).toBeChecked();
    });
  });

  test('수정 모드에서 기존 상태 표시', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const activeRadio = screen.getByRole('radio', { name: /판매중/ });
    expect(activeRadio).toBeChecked();
  });

  test('가용재고 0이고 품절 아닌 경우 경고 배너 표시', () => {
    const product = { ...MOCK_PRODUCT, stock: { ...MOCK_PRODUCT.stock, available: 0 } };
    render(<ProductDetailForm product={product} isNew={false} />);
    expect(screen.getByText(/가용 재고가 0입니다/)).toBeInTheDocument();
  });

  test('경고 배너의 품절로 변경 버튼 클릭 시 상태 변경', async () => {
    const product = { ...MOCK_PRODUCT, stock: { ...MOCK_PRODUCT.stock, available: 0 } };
    render(<ProductDetailForm product={product} isNew={false} />);
    const changeBtn = screen.getByRole('button', { name: '품절로 변경' });
    fireEvent.click(changeBtn);
    await waitFor(() => {
      const soldOutRadio = screen.getByRole('radio', { name: /품절/ });
      expect(soldOutRadio).toBeChecked();
    });
  });
});

// ── 임시저장 ──────────────────────────────────────────────────────────────────

describe('임시저장', () => {
  test('임시저장 버튼 클릭 시 localStorage에 저장', async () => {
    render(<ProductDetailForm isNew={true} />);
    // 헤더의 임시저장 버튼 (첫 번째)
    fireEvent.click(getFirstBtn('임시저장'));
    await waitFor(() => {
      const key = 'sellops_product_draft_user_new';
      expect(localStorageMock.getItem(key)).not.toBeNull();
    });
  });

  test('임시저장 내용이 있으면 복원 배너 표시', () => {
    const draft = {
      data: { name: '임시 저장 상품', productCode: 'DRAFT-001', price: 5000, summary: '', shortDescription: '', description: '', status: 'active' },
      savedAt:   Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorageMock.setItem('sellops_product_draft_user_new', JSON.stringify(draft));

    render(<ProductDetailForm isNew={true} />);
    expect(screen.getByText(/임시 저장된 내용이 있습니다/)).toBeInTheDocument();
  });

  test('복원 클릭 시 임시저장 내용 폼에 반영', async () => {
    const draft = {
      data: { name: '임시 저장 상품', productCode: 'DRAFT-001', price: 5000, summary: '', shortDescription: '', description: '', status: 'active' },
      savedAt:   Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorageMock.setItem('sellops_product_draft_user_new', JSON.stringify(draft));

    render(<ProductDetailForm isNew={true} />);
    const restoreBtn = screen.getByRole('button', { name: '복원' });
    fireEvent.click(restoreBtn);
    await waitFor(() => {
      expect(screen.getByDisplayValue('임시 저장 상품')).toBeInTheDocument();
    });
  });

  test('무시 클릭 시 배너 닫힘', async () => {
    const draft = {
      data: { name: '임시 저장 상품', productCode: 'DRAFT-001', price: 5000, summary: '', shortDescription: '', description: '', status: 'active' },
      savedAt:   Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorageMock.setItem('sellops_product_draft_user_new', JSON.stringify(draft));

    render(<ProductDetailForm isNew={true} />);
    const ignoreBtn = screen.getByRole('button', { name: '임시저장 무시' });
    fireEvent.click(ignoreBtn);
    await waitFor(() => {
      expect(screen.queryByText(/임시 저장된 내용이 있습니다/)).not.toBeInTheDocument();
    });
  });

  test('만료된 임시저장은 배너 미표시', () => {
    const draft = {
      data: { name: '만료된 상품', productCode: 'EXP-001', price: 0, summary: '', shortDescription: '', description: '', status: 'active' },
      savedAt:   Date.now() - 8 * 24 * 60 * 60 * 1000,
      expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    };
    localStorageMock.setItem('sellops_product_draft_user_new', JSON.stringify(draft));

    render(<ProductDetailForm isNew={true} />);
    expect(screen.queryByText(/임시 저장된 내용이 있습니다/)).not.toBeInTheDocument();
  });
});

// ── 저장 플로우 ───────────────────────────────────────────────────────────────

describe('저장 플로우', () => {
  test('신규 등록 성공 시 페이지 이동 없이 수정 모드로 전환', async () => {
    const MOCK_NEW_PRODUCT: ProductDetail = {
      id:               'prod-new',
      productCode:      'NEW-CODE',
      name:             '새 상품',
      category:         '미분류',
      price:            10000,
      summary:          '',
      shortDescription: '',
      description:      '',
      status:           'active',
      stock:            { total: 0, sold: 0, available: 0 },
      images:           [],
      createdAt:        '2024-01-15T00:00:00.000Z',
      updatedAt:        '2024-01-15T00:00:00.000Z',
      createdBy:        '관리자',
    };
    const actions = jest.requireMock('@/app/actions/products');
    actions.saveProductAction.mockResolvedValue({ id: 'prod-new', product: MOCK_NEW_PRODUCT });

    const replaceStateSpy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    render(<ProductDetailForm isNew={true} />);

    await userEvent.type(screen.getByPlaceholderText('상품명을 입력해주세요.'), '새 상품');
    await userEvent.type(screen.getByPlaceholderText('예: PRD-ABC123'), 'NEW-CODE');
    await userEvent.type(screen.getByPlaceholderText('0'), '10000');

    // 중복확인
    fireEvent.click(screen.getByRole('button', { name: '상품코드 중복 확인' }));
    await waitFor(() => {
      expect(screen.getByText('사용 가능한 코드입니다.')).toBeInTheDocument();
    });

    // 저장 (헤더 버튼)
    fireEvent.click(getFirstBtn('저장하기'));
    await waitFor(() => {
      expect(screen.getByText('상품이 등록되었습니다.')).toBeInTheDocument();
    });

    // 페이지 이동 없음, URL만 교체
    expect(mockPush).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/dashboard/products/prod-new');

    // 수정 모드로 전환됨 (타이틀이 상품명으로 변경, 저장 정보 섹션 노출)
    await waitFor(() => {
      expect(screen.getByText('prod-new')).toBeInTheDocument();
    });

    replaceStateSpy.mockRestore();
  });

  test('수정 저장 성공 시 라우팅 없음', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    fireEvent.click(getFirstBtn('저장하기'));
    await waitFor(() => {
      const actions = jest.requireMock('@/app/actions/products');
      expect(actions.saveProductAction).toHaveBeenCalledWith(expect.any(Object), 'prod-001');
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('저장 실패 시 에러 토스트 표시', async () => {
    const actions = jest.requireMock('@/app/actions/products');
    actions.saveProductAction.mockRejectedValue(new Error('서버 오류'));

    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    fireEvent.click(getFirstBtn('저장하기'));
    await waitFor(() => {
      expect(screen.getByText('저장에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument();
    });
  });

  test('저장 성공 시 성공 토스트 표시', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    fireEvent.click(getFirstBtn('저장하기'));
    await waitFor(() => {
      expect(screen.getByText('변경사항이 저장되었습니다.')).toBeInTheDocument();
    });
  });
});

// ── 이탈 가드 ─────────────────────────────────────────────────────────────────

describe('이탈 가드', () => {
  test('변경사항 없을 때 뒤로가기 클릭 시 바로 이동', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const backBtn = screen.getByRole('button', { name: '상품 목록으로 이동' });
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/products');
    });
    expect(screen.queryByText('변경 사항을 저장하지 않고 나가시겠습니까?')).not.toBeInTheDocument();
  });

  test('변경사항 있을 때 뒤로가기 클릭 시 확인 모달 표시', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    // 상품명 변경
    const nameInput = screen.getByDisplayValue('MX Keys S 키보드 블랙');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '변경된 상품명');

    const backBtn = screen.getByRole('button', { name: '상품 목록으로 이동' });
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(screen.getByText('변경 사항을 저장하지 않고 나가시겠습니까?')).toBeInTheDocument();
    });
  });

  test('이탈 확인 모달에서 계속 편집 클릭 시 모달 닫힘', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const nameInput = screen.getByDisplayValue('MX Keys S 키보드 블랙');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '변경된 상품명');

    fireEvent.click(screen.getByRole('button', { name: '상품 목록으로 이동' }));
    await waitFor(() => {
      expect(screen.getByText('변경 사항을 저장하지 않고 나가시겠습니까?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '계속 편집' }));
    await waitFor(() => {
      expect(screen.queryByText('변경 사항을 저장하지 않고 나가시겠습니까?')).not.toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('이탈 확인 모달에서 저장하지 않고 나가기 클릭 시 이동', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const nameInput = screen.getByDisplayValue('MX Keys S 키보드 블랙');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '변경된 상품명');

    fireEvent.click(screen.getByRole('button', { name: '상품 목록으로 이동' }));
    await waitFor(() => {
      expect(screen.getByText('변경 사항을 저장하지 않고 나가시겠습니까?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 나가기' }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/products');
    });
  });
});

// ── 재고 관리 ─────────────────────────────────────────────────────────────────

describe('재고 관리', () => {
  test('재고 현황이 표시됨 (수정 모드)', () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    // 가용 재고: 142
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  test('신규 등록 모드 - 입고 조정 후 재고 현황 즉시 반영', async () => {
    render(<ProductDetailForm isNew={true} />);
    const qtyInput = screen.getByLabelText('수량');
    await userEvent.type(qtyInput, '50');
    fireEvent.click(screen.getByRole('button', { name: '재고 조정 적용' }));
    await waitFor(() => {
      // 입고 50 → 전체 입고 50, 가용 재고 50 (두 셀 모두 '50' 표시)
      expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('재고가 반영되었습니다. 저장 시 적용됩니다.')).toBeInTheDocument();
    });
  });

  test('신규 등록 모드 - 출고 버튼 비활성화', () => {
    render(<ProductDetailForm isNew={true} />);
    const outRadio = screen.getByRole('radio', { name: /출고/ });
    expect(outRadio).toBeDisabled();
  });

  test('입고 조정 시 대기 중 토스트 표시', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const qtyInput = screen.getByLabelText('수량');
    await userEvent.type(qtyInput, '10');
    const applyBtn = screen.getByRole('button', { name: '재고 조정 적용' });
    fireEvent.click(applyBtn);
    await waitFor(() => {
      expect(screen.getByText('재고 조정이 대기 중입니다. 저장하기를 눌러 적용하세요.')).toBeInTheDocument();
    });
  });

  test('수량 미입력 시 에러 메시지', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const applyBtn = screen.getByRole('button', { name: '재고 조정 적용' });
    fireEvent.click(applyBtn);
    await waitFor(() => {
      expect(screen.getByText('수량은 1 이상 정수를 입력해주세요.')).toBeInTheDocument();
    });
  });

  test('출고 수량이 가용 재고 초과 시 에러', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    // 출고 선택 (라디오 그룹 중 "출고")
    const outRadios = screen.getAllByRole('radio', { name: /출고/ });
    fireEvent.click(outRadios[0]);
    const qtyInput = screen.getByLabelText('수량');
    await userEvent.type(qtyInput, '200');
    fireEvent.click(screen.getByRole('button', { name: '재고 조정 적용' }));
    await waitFor(() => {
      expect(screen.getByText('가용 재고보다 많은 수량입니다.')).toBeInTheDocument();
    });
  });

  test('재고 이력 보기 버튼 클릭 시 이력 표시', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const histBtn = screen.getByRole('button', { name: /재고 이력 보기/ });
    fireEvent.click(histBtn);
    await waitFor(() => {
      expect(screen.getByText('KB-MXS-BLK')).toBeInTheDocument();
    });
  });

  test('재고 이력 보기 재클릭 시 닫힘', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const histBtn = screen.getByRole('button', { name: /재고 이력 보기/ });
    fireEvent.click(histBtn);
    await waitFor(() => {
      expect(screen.getByText('KB-MXS-BLK')).toBeInTheDocument();
    });
    fireEvent.click(histBtn);
    await waitFor(() => {
      expect(screen.queryByText('KB-MXS-BLK')).not.toBeInTheDocument();
    });
  });
});

// ── ID 복사 ───────────────────────────────────────────────────────────────────

describe('상품 ID 복사', () => {
  test('ID 복사 버튼 클릭 시 클립보드에 복사', async () => {
    render(<ProductDetailForm product={MOCK_PRODUCT} isNew={false} />);
    const copyBtn = screen.getByRole('button', { name: '상품 ID 복사' });
    fireEvent.click(copyBtn);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('prod-001');
    });
  });
});

// ── 상품명 글자수 카운터 ──────────────────────────────────────────────────────

describe('글자수 카운터', () => {
  test('상품명 입력 시 글자수 실시간 표시', async () => {
    render(<ProductDetailForm isNew={true} />);
    const nameInput = screen.getByPlaceholderText('상품명을 입력해주세요.');
    await userEvent.type(nameInput, '테스트');
    expect(screen.getByText('3/100')).toBeInTheDocument();
  });
});
