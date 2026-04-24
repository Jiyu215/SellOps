'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useId,
  useMemo,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  PlusOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
  HolderOutlined,
  CopyOutlined,
  DownOutlined,
  UpOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import type {
  ProductDetail,
  ProductImage,
  ProductStatus,
  StockHistory,
  ProductFormData,
  ProductFormErrors,
  CodeCheckState,
  ProductDraft,
  StockAdjustmentType,
  ImageType,
} from '@/types/products';
import { PRODUCT_STATUS_MAP } from '@/constants/productConstants';
import { formatProductDate, formatPrice } from '@/utils/productUtils';
import {
  checkProductCode,
  adjustStock,
  getStockHistory,
} from '@/services/productDetailService';
import { saveProductAction } from '@/app/actions/products';

// ── 상수 ─────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE   = 10 * 1024 * 1024;  // 10MB
const MAX_EXTRA_IMGS  = 20;
const DRAFT_TTL_MS    = 7 * 24 * 60 * 60 * 1000;  // 7일
const ALLOWED_MIME    = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const IMAGE_TYPE_CONFIG: Record<Exclude<ImageType, 'extra'>, { label: string; spec: string }> = {
  main:      { label: '대표 이미지',  spec: '500×500 · 권장 1500×1500' },
  list:      { label: '목록 이미지',  spec: '300×300 · 권장 600×600'   },
  small:     { label: '작은 목록',    spec: '100×100'                   },
  thumbnail: { label: '축소 이미지',  spec: '220×220 · 권장 300×300'   },
};

const STATUS_DESCRIPTIONS: Record<ProductStatus, string> = {
  active:   '고객에게 노출, 구매 가능',
  hidden:   '고객 미노출, 내부 관리용',
  sold_out: '고객 노출, 구매 불가',
};

// ── 이미지 API 헬퍼 ──────────────────────────────────────────────────────────

async function uploadImageViaApi(
  productId: string,
  file: File,
  type: ImageType,
  order?: number,
): Promise<ProductImage> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  if (order !== undefined) form.append('order', String(order));

  const res = await fetch(`/api/products/${productId}/images`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? '이미지 업로드에 실패했습니다. 다시 시도해주세요.');
  }
  const data = await res.json() as {
    id: string; type: string; url: string; order?: number;
    file_name?: string; size_mb?: number; created_at?: string;
  };
  return {
    id:        data.id,
    type:      data.type as ImageType,
    url:       data.url,
    fileName:  data.file_name ?? file.name,
    fileSize:  Math.round((data.size_mb ?? 0) * 1024 * 1024) || file.size,
    order:     data.order,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

async function deleteImageViaApi(productId: string, imageId: string): Promise<void> {
  const res = await fetch(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? '이미지 삭제에 실패했습니다.');
  }
}

// ── 임시저장 키 생성 ──────────────────────────────────────────────────────────

function getDraftKey(productId: string | null): string {
  return `sellops_product_draft_user_${productId ?? 'new'}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ProductDetailFormProps {
  product?: ProductDetail;
  isNew:    boolean;
}

// ── 폼 초기값 ─────────────────────────────────────────────────────────────────

function getInitialFormData(product?: ProductDetail): ProductFormData {
  if (!product) {
    return {
      name:             '',
      productCode:      '',
      price:            '',
      summary:          '',
      shortDescription: '',
      description:      '',
      status:           'active',
    };
  }
  return {
    name:             product.name,
    productCode:      product.productCode,
    price:            product.price,
    summary:          product.summary,
    shortDescription: product.shortDescription,
    description:      product.description,
    status:           product.status,
  };
}

// ── 파일 크기 포맷 ────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`;
  return `${(bytes / 1_000).toFixed(0)}KB`;
}

// ── 재고 이력 날짜 포맷 ───────────────────────────────────────────────────────

function formatHistoryDate(iso: string): string {
  const d   = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y   = kst.getUTCFullYear();
  const mo  = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd  = String(kst.getUTCDate()).padStart(2, '0');
  const hh  = String(kst.getUTCHours()).padStart(2, '0');
  const mm  = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${y}.${mo}.${dd} ${hh}:${mm}`;
}

// ── 섹션 카드 래퍼 ───────────────────────────────────────────────────────────

const SectionCard = ({
  title,
  children,
  className = '',
}: {
  title:      string;
  children:   React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-light-surface dark:bg-dark-surface rounded-lg shadow-sm border border-light-border dark:border-dark-border p-lg flex flex-col gap-md ${className}`}>
    <h2 className="text-bodyMd font-semibold text-light-textPrimary dark:text-dark-textPrimary border-b border-light-border dark:border-dark-border pb-sm">
      {title}
    </h2>
    {children}
  </div>
);

// ── 폼 필드 래퍼 ─────────────────────────────────────────────────────────────

const FieldGroup = ({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id:        string;
  label:     string;
  required?: boolean;
  error?:    string;
  hint?:     string;
  children:  React.ReactNode;
}) => (
  <div className="flex flex-col gap-xs">
    <label
      htmlFor={id}
      className="text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary"
    >
      {label}
      {required && (
        <span className="text-light-error dark:text-dark-error ml-xs" aria-hidden="true">*</span>
      )}
    </label>
    {children}
    {error && (
      <p
        id={`${id}-error`}
        role="alert"
        className="text-caption text-light-error dark:text-dark-error flex items-center gap-xs"
      >
        <ExclamationCircleOutlined aria-hidden="true" />
        {error}
      </p>
    )}
    {!error && hint && (
      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">{hint}</p>
    )}
  </div>
);

// ── 입력 기본 스타일 ─────────────────────────────────────────────────────────

const inputCls = (hasError: boolean) =>
  [
    'w-full rounded-md border bg-light-background dark:bg-dark-background',
    'text-bodySm text-light-textPrimary dark:text-dark-textPrimary',
    'px-sm py-xs focus:outline-none focus:ring-2 transition-colors',
    hasError
      ? 'border-light-error dark:border-dark-error focus:ring-red-300/40'
      : 'border-light-border dark:border-dark-border focus:ring-light-primary/30 dark:focus:ring-dark-primary/30 focus:border-light-primary dark:focus:border-dark-primary',
  ].join(' ');

// ── 이미지 드롭존 ─────────────────────────────────────────────────────────────

interface ImageDropZoneProps {
  imageType:    Exclude<ImageType, 'extra'>;
  image:        ProductImage | null;
  isUploading?: boolean;
  onFileSelect: (file: File, type: Exclude<ImageType, 'extra'>) => void;
  onRemove:     (type: Exclude<ImageType, 'extra'>) => void;
}

const ImageDropZone = ({ imageType, image, isUploading, onFileSelect, onRemove }: ImageDropZoneProps) => {
  const config    = IMAGE_TYPE_CONFIG[imageType];
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file, imageType);
  }, [imageType, onFileSelect]);

  const handleDragOver  = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); }
  };

  return (
    <div className="flex flex-col gap-xs">
      <span className="text-caption font-medium text-light-textSecondary dark:text-dark-textSecondary">{config.label}</span>
      {image && image.url ? (
        <div className="relative rounded-md border border-light-border dark:border-dark-border overflow-hidden group aspect-square">
          {isUploading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <LoadingOutlined className="text-h3 text-white animate-spin" aria-label="업로드 중" />
            </div>
          )}
          <Image
            src={image.url}
            alt={config.label}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={() => onRemove(imageType)}
              aria-label={`${config.label} 삭제`}
              className="p-xs rounded-full bg-white/20 hover:bg-red-500/80 text-white transition-colors"
            >
              <DeleteOutlined />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-xs py-xs">
            <p className="text-caption text-white truncate">{image.fileName}</p>
            <p className="text-overline text-white/70">{formatFileSize(image.fileSize)}</p>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${config.label} 업로드`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={handleKeyDown}
          onClick={() => inputRef.current?.click()}
          className={[
            'rounded-md border-2 border-dashed cursor-pointer',
            'flex flex-col items-center justify-center gap-xs p-md aspect-square',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-light-primary/30',
            dragging
              ? 'border-light-primary dark:border-dark-primary bg-blue-50 dark:bg-blue-900/10'
              : 'border-light-border dark:border-dark-border hover:border-light-primary dark:hover:border-dark-primary hover:bg-light-secondary dark:hover:bg-dark-secondary',
          ].join(' ')}
        >
          <CloudUploadOutlined className="text-h4 text-light-textSecondary dark:text-dark-textSecondary" aria-hidden="true" />
          <p className="text-caption text-center text-light-textSecondary dark:text-dark-textSecondary leading-relaxed">
            클릭 또는 드래그
            <br />
            <span className="text-overline text-light-textSecondary/70 dark:text-dark-textSecondary/70">{config.spec}</span>
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onFileSelect(file, imageType); e.target.value = ''; }
        }}
      />
    </div>
  );
};

// ── 추가 이미지 카드 ──────────────────────────────────────────────────────────

interface ExtraImageCardProps {
  image:        ProductImage;
  isDragOver:   boolean;
  isUploading?: boolean;
  onRemove:     (id: string) => void;
  onDragStart:  (id: string) => void;
  onDragOver:   (id: string) => void;
  onDrop:       (id: string) => void;
}

const ExtraImageCard = ({
  image, isDragOver, isUploading, onRemove, onDragStart, onDragOver, onDrop,
}: ExtraImageCardProps) => (
  <div
    draggable
    onDragStart={() => onDragStart(image.id)}
    onDragOver={(e) => { e.preventDefault(); onDragOver(image.id); }}
    onDrop={() => onDrop(image.id)}
    aria-label={`추가 이미지: ${image.fileName}`}
    className={[
      'relative rounded-md border overflow-hidden group aspect-square cursor-grab active:cursor-grabbing',
      isDragOver
        ? 'border-light-primary dark:border-dark-primary ring-2 ring-light-primary/30'
        : 'border-light-border dark:border-dark-border',
    ].join(' ')}
  >
    {/* 드래그 핸들 */}
    <div className="absolute top-xs left-xs z-10 p-xs rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" aria-hidden="true">
      <HolderOutlined className="text-caption" />
    </div>

    {/* 삭제 버튼 */}
    <button
      type="button"
      onClick={() => onRemove(image.id)}
      aria-label={`${image.fileName} 삭제`}
      className="absolute top-xs right-xs z-10 p-xs rounded-full bg-black/40 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all"
    >
      <DeleteOutlined className="text-caption" />
    </button>

    {isUploading && (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
        <LoadingOutlined className="text-h3 text-white animate-spin" aria-label="업로드 중" />
      </div>
    )}

    {image.url ? (
      <Image src={image.url} alt={image.fileName} fill className="object-cover pointer-events-none" />
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-light-secondary dark:bg-dark-secondary">
        <FileImageOutlined className="text-h3 text-light-textSecondary dark:text-dark-textSecondary" aria-hidden="true" />
      </div>
    )}

    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-xs py-xs opacity-0 group-hover:opacity-100 transition-opacity">
      <p className="text-overline text-white truncate">{image.fileName}</p>
    </div>
  </div>
);

// ── 이탈 확인 모달 ────────────────────────────────────────────────────────────

interface LeaveModalProps {
  onStay:  () => void;
  onLeave: () => void;
}

const LeaveModal = ({ onStay, onLeave }: LeaveModalProps) => {
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onStay(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onStay]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onStay} />
      <div
        className={[
          'relative w-full bg-light-surface dark:bg-dark-surface shadow-xl z-10',
          'rounded-t-lg max-h-[85vh] px-md pt-xs pb-xl',
          'md:rounded-lg md:w-[420px] md:px-lg md:pt-lg md:pb-lg',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 핸들바 */}
        <div className="flex justify-center pt-sm pb-md md:hidden" aria-hidden="true">
          <div className="w-9 h-1 rounded-full bg-light-border dark:bg-dark-border" />
        </div>

        <h2 id="leave-modal-title" className="text-bodyMd font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-sm">
          변경 사항을 저장하지 않고 나가시겠습니까?
        </h2>
        <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary mb-lg">
          저장하지 않은 내용은 사라집니다.
        </p>
        <div className="flex gap-sm">
          <button
            type="button"
            onClick={onStay}
            className="flex-1 py-sm px-md rounded-md border border-light-border dark:border-dark-border text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
          >
            계속 편집
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 py-sm px-md rounded-md bg-light-error dark:bg-dark-error text-bodySm font-medium text-white hover:opacity-90 transition-opacity"
          >
            저장하지 않고 나가기
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// ── 토스트 ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type:    'success' | 'error' | 'info';
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export const ProductDetailForm = ({ product, isNew }: ProductDetailFormProps) => {
  const router    = useRouter();
  const uid       = useId();
  const fid       = (field: string) => `${uid}-${field}`;

  // ── 폼 상태 ──────────────────────────────────────────────
  const [formData, setFormData] = useState<ProductFormData>(() => getInitialFormData(product));
  const [errors,   setErrors]   = useState<ProductFormErrors>({});

  // ── 상품코드 중복 확인 ────────────────────────────────────
  const [codeCheck, setCodeCheck] = useState<CodeCheckState>(isNew ? 'idle' : 'available');
  const [codeCheckedFor, setCodeCheckedFor] = useState<string>(product?.productCode ?? '');

  // ── 저장 상태 ────────────────────────────────────────────
  const [isSaving,      setIsSaving]      = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isDeleting,    setIsDeleting]    = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── 변경 감지 ────────────────────────────────────────────
  const isDirtyRef      = useRef(false);
  const initialDataRef  = useRef<ProductFormData>(getInitialFormData(product));

  // ── 이탈 모달 ────────────────────────────────────────────
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const leaveTargetRef = useRef<string | null>(null);

  // ── 임시저장 배너 ─────────────────────────────────────────
  const [draftBanner, setDraftBanner] = useState(false);

  // ── 토스트 ───────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 이미지 상태 ──────────────────────────────────────────
  const [typedImages, setTypedImages] = useState<Partial<Record<Exclude<ImageType, 'extra'>, ProductImage>>>(() => {
    const init: Partial<Record<Exclude<ImageType, 'extra'>, ProductImage>> = {};
    product?.images.forEach((img) => {
      if (img.type !== 'extra') init[img.type] = img;
    });
    return init;
  });
  const [extraImages, setExtraImages] = useState<ProductImage[]>(() =>
    (product?.images ?? []).filter((img) => img.type === 'extra'),
  );
  const [extraDragOver, setExtraDragOver] = useState<string | null>(null);
  const extraDragIdRef = useRef<string | null>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);

  // ── 신규 등록 중 미업로드 파일 보관 (productId 확정 후 일괄 업로드) ──
  const pendingTypedFilesRef  = useRef<Partial<Record<Exclude<ImageType, 'extra'>, File>>>({});
  const pendingExtraFilesRef  = useRef<Array<{ localId: string; file: File }>>([]);
  // ── 수정 모드 이미지 변경 대기 (저장하기 클릭 시 일괄 적용) ──────────
  const pendingTypedEditRef = useRef<Partial<Record<Exclude<ImageType, 'extra'>, File>>>({});
  const pendingExtraEditRef = useRef<Array<{ localId: string; file: File }>>([]);
  const pendingDeleteIdsRef = useRef<string[]>([]);
  const [hasPendingImages,  setHasPendingImages] = useState(false);

  // ── 재고 상태 ────────────────────────────────────────────
  const [stock, setStock] = useState(product?.stock ?? { total: 0, sold: 0, available: 0 });

  // ── 재고 조정 폼 ─────────────────────────────────────────
  const [adjustType,     setAdjustType]     = useState<StockAdjustmentType>('in');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason,   setAdjustReason]   = useState('');
  const [adjustError,    setAdjustError]    = useState('');

  // ── 저장 대기 중인 재고 조정 (기존 상품, 저장하기 클릭 시 일괄 적용) ──
  const [pendingStockAdjustments, setPendingStockAdjustments] = useState<Array<{
    type: StockAdjustmentType;
    quantity: number;
    reason: string;
  }>>([]);

  // ── 재고 이력 ────────────────────────────────────────────
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [historyItems,   setHistoryItems]   = useState<StockHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── 클립보드 복사 ─────────────────────────────────────────
  const [copiedId, setCopiedId] = useState(false);

  // ── 신규 저장 후 전환된 상품 (페이지 이동 없이 수정 모드로 전환) ──
  const [savedNewProduct, setSavedNewProduct] = useState<ProductDetail | null>(null);
  const currentProduct = savedNewProduct ?? product;
  const currentIsNew   = savedNewProduct === null && isNew;

  // ── 필드 ref (첫 에러 포커스용) ───────────────────────────
  const nameRef        = useRef<HTMLInputElement>(null);
  const codeRef        = useRef<HTMLInputElement>(null);
  const priceRef       = useRef<HTMLInputElement>(null);

  // ── 토스트 표시 ──────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── 변경 감지 ────────────────────────────────────────────
  useEffect(() => {
    const initial = initialDataRef.current;
    const formChanged =
      formData.name             !== initial.name             ||
      formData.productCode      !== initial.productCode      ||
      formData.price            !== initial.price            ||
      formData.summary          !== initial.summary          ||
      formData.shortDescription !== initial.shortDescription ||
      formData.description      !== initial.description      ||
      formData.status           !== initial.status;

    isDirtyRef.current = formChanged || pendingStockAdjustments.length > 0 || hasPendingImages;
  }, [formData, pendingStockAdjustments, hasPendingImages]);

  // ── beforeunload 이탈 방지 ────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ── 임시저장 복원 확인 ────────────────────────────────────
  useEffect(() => {
    try {
      const key   = getDraftKey(product?.id ?? null);
      const raw   = localStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw) as ProductDraft;
      if (draft.expiresAt < Date.now()) {
        localStorage.removeItem(key);
        return;
      }
      setDraftBanner(true);
    } catch {
      // localStorage 접근 실패 무시
    }
  }, [product?.id]);

  // ── 임시저장 복원 ────────────────────────────────────────
  const handleRestoreDraft = useCallback(() => {
    try {
      const key   = getDraftKey(product?.id ?? null);
      const raw   = localStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw) as ProductDraft;
      setFormData(draft.data);
      setDraftBanner(false);
      showToast('임시저장 내용을 복원했습니다.', 'info');
    } catch {
      showToast('복원에 실패했습니다.', 'error');
    }
  }, [product?.id, showToast]);

  const handleIgnoreDraft = useCallback(() => {
    try {
      const key = getDraftKey(product?.id ?? null);
      localStorage.removeItem(key);
    } catch { /* 무시 */ }
    setDraftBanner(false);
  }, [product?.id]);

  // ── 임시저장 ─────────────────────────────────────────────
  const handleDraftSave = useCallback(async () => {
    setIsDraftSaving(true);
    try {
      const key: string  = getDraftKey(product?.id ?? null);
      const now          = Date.now();
      const draft: ProductDraft = {
        data:      formData,
        savedAt:   now,
        expiresAt: now + DRAFT_TTL_MS,
      };
      localStorage.setItem(key, JSON.stringify(draft));
      showToast('임시저장 되었습니다.', 'success');
    } catch {
      showToast('임시저장에 실패했습니다.', 'error');
    } finally {
      setIsDraftSaving(false);
    }
  }, [formData, product?.id, showToast]);

  // ── 뒤로가기 (이탈 가드) ─────────────────────────────────
  const handleBack = useCallback(() => {
    if (isDirtyRef.current) {
      leaveTargetRef.current = '/dashboard/products';
      setShowLeaveModal(true);
    } else {
      router.push('/dashboard/products');
    }
  }, [router]);

  const handleLeaveConfirm = useCallback(() => {
    isDirtyRef.current = false;
    const target = leaveTargetRef.current ?? '/dashboard/products';
    setShowLeaveModal(false);
    router.push(target);
  }, [router]);

  // ── 폼 필드 업데이트 ─────────────────────────────────────
  const setField = useCallback(
    <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      // 에러 입력 중 실시간 해제
      if (key in errors) {
        setErrors((prev) => { const next = { ...prev }; delete next[key as keyof ProductFormErrors]; return next; });
      }
      // 상품코드 변경 시 확인 상태 초기화
      if (key === 'productCode') {
        setCodeCheck('idle');
        setCodeCheckedFor('');
      }
    },
    [errors],
  );

  // ── 유효성 검사 ──────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const next: ProductFormErrors = {};

    if (!formData.name.trim()) {
      next.name = '상품명을 입력해주세요.';
    } else if (formData.name.trim().length > 100) {
      next.name = '상품명은 100자 이내로 입력해주세요.';
    }

    if (!formData.productCode.trim()) {
      next.productCode = '상품코드를 입력해주세요.';
    } else if (!/^[A-Za-z0-9-]+$/.test(formData.productCode.trim())) {
      next.productCode = '상품코드는 영문, 숫자, 하이픈만 사용 가능합니다.';
    } else if (formData.productCode.trim() !== codeCheckedFor || codeCheck !== 'available') {
      next.productCode = '상품코드 중복 확인을 완료해주세요.';
    }

    if (formData.price === '' || formData.price < 0 || !Number.isInteger(formData.price)) {
      next.price = '올바른 금액을 입력해주세요.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [formData, codeCheck, codeCheckedFor]);

  // ── 첫 에러 필드 포커스 ───────────────────────────────────
  const focusFirstError = useCallback((errs: ProductFormErrors) => {
    if (errs.name)        { nameRef.current?.focus(); nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (errs.productCode) { codeRef.current?.focus(); codeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (errs.price)       { priceRef.current?.focus(); priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, []);

  // ── blur 단일 유효성 ─────────────────────────────────────
  const handleBlur = useCallback((field: keyof ProductFormErrors) => {
    const next: ProductFormErrors = { ...errors };

    if (field === 'name') {
      if (!formData.name.trim()) next.name = '상품명을 입력해주세요.';
      else if (formData.name.trim().length > 100) next.name = '상품명은 100자 이내로 입력해주세요.';
      else delete next.name;
    }
    if (field === 'productCode') {
      if (!formData.productCode.trim()) next.productCode = '상품코드를 입력해주세요.';
      else if (!/^[A-Za-z0-9-]+$/.test(formData.productCode.trim())) next.productCode = '상품코드는 영문, 숫자, 하이픈만 사용 가능합니다.';
      else delete next.productCode;
    }
    if (field === 'price') {
      const v = formData.price;
      if (v === '' || v < 0 || !Number.isInteger(v)) next.price = '올바른 금액을 입력해주세요.';
      else delete next.price;
    }

    setErrors(next);
  }, [errors, formData]);

  // ── 상품코드 중복 확인 ────────────────────────────────────
  const handleCodeCheck = useCallback(async () => {
    const code = formData.productCode.trim();
    if (!code) { setErrors((prev) => ({ ...prev, productCode: '상품코드를 입력해주세요.' })); return; }
    if (!/^[A-Za-z0-9-]+$/.test(code)) { setErrors((prev) => ({ ...prev, productCode: '상품코드는 영문, 숫자, 하이픈만 사용 가능합니다.' })); return; }

    setCodeCheck('checking');
    try {
      const { available } = await checkProductCode(code, product?.id);
      setCodeCheck(available ? 'available' : 'taken');
      setCodeCheckedFor(code);
      if (!available) {
        setErrors((prev) => ({ ...prev, productCode: '이미 사용 중인 상품코드입니다.' }));
      } else {
        setErrors((prev) => { const next = { ...prev }; delete next.productCode; return next; });
      }
    } catch {
      setCodeCheck('error');
      setErrors((prev) => ({ ...prev, productCode: '확인에 실패했습니다. 다시 시도해주세요.' }));
    }
  }, [formData.productCode, product?.id]);

  // ── UUID 기반 코드 자동 생성 ──────────────────────────────
  const handleAutoGenCode = useCallback(() => {
    const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code   = `PRD-${suffix}`;
    setField('productCode', code);
  }, [setField]);

  // ── 저장 ─────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const valid = validate();
    if (!valid) {
      const errs = {} as ProductFormErrors;
      if (!formData.name.trim()) errs.name = '상품명을 입력해주세요.';
      if (formData.price === '' || formData.price < 0) errs.price = '올바른 금액을 입력해주세요.';
      if (!formData.productCode.trim()) errs.productCode = '상품코드를 입력해주세요.';
      focusFirstError(errs);
      return;
    }

    setIsSaving(true);
    try {
      if (currentIsNew) {
        // 신규 등록: 서버 액션으로 저장 후 페이지 이동 없이 수정 모드로 전환
        const { id, product: newProduct } = await saveProductAction(formData, undefined, stock);
        try { localStorage.removeItem(getDraftKey(null)); } catch { /* 무시 */ }
        isDirtyRef.current = false;
        initialDataRef.current = { ...formData };
        window.history.replaceState(null, '', `/dashboard/products/${id}`);

        // pending 이미지 일괄 업로드
        const pendingTyped  = { ...pendingTypedFilesRef.current };
        const pendingExtras = [...pendingExtraFilesRef.current];
        pendingTypedFilesRef.current  = {};
        pendingExtraFilesRef.current  = [];

        const uploadResults = await Promise.allSettled([
          ...Object.entries(pendingTyped).map(async ([type, file]) => {
            try {
              const uploaded = await uploadImageViaApi(id, file, type as Exclude<ImageType, 'extra'>);
              setTypedImages((p) => ({ ...p, [type]: uploaded }));
            } catch { /* 개별 실패는 토스트 생략, 사용자가 재업로드 가능 */ }
          }),
          ...pendingExtras.map(async ({ localId, file }, i) => {
            try {
              const uploaded = await uploadImageViaApi(id, file, 'extra', i);
              setExtraImages((prev) => prev.map((img) => img.id === localId ? uploaded : img));
            } catch { /* 개별 실패 */ }
          }),
        ]);

        const anyFailed = uploadResults.some((r) => r.status === 'rejected');
        if (anyFailed) {
          showToast('일부 이미지 업로드에 실패했습니다. 다시 시도해주세요.', 'error');
        }

        if (newProduct) setSavedNewProduct(newProduct);
        showToast('상품이 등록되었습니다.', 'success');
      } else {
        // 수정: 서버 액션으로 저장
        await saveProductAction(formData, currentProduct!.id);

        // 대기 중인 이미지 변경 일괄 처리
        const deleteIds    = [...pendingDeleteIdsRef.current];
        const typedUploads = { ...pendingTypedEditRef.current };
        const extraUploads = [...pendingExtraEditRef.current];
        pendingDeleteIdsRef.current  = [];
        pendingTypedEditRef.current  = {};
        pendingExtraEditRef.current  = [];

        if (deleteIds.length > 0 || Object.keys(typedUploads).length > 0 || extraUploads.length > 0) {
          // 삭제 처리
          if (deleteIds.length > 0) {
            await Promise.allSettled(
              deleteIds.map((imageId) => deleteImageViaApi(currentProduct!.id, imageId)),
            );
          }

          // 규격 이미지 업로드
          const typedResults = await Promise.allSettled(
            Object.entries(typedUploads).map(async ([type, file]) => {
              const uploaded = await uploadImageViaApi(
                currentProduct!.id, file, type as Exclude<ImageType, 'extra'>,
              );
              setTypedImages((p) => {
                const prev = p[type as Exclude<ImageType, 'extra'>];
                if (prev?.url.startsWith('blob:')) URL.revokeObjectURL(prev.url);
                return { ...p, [type]: uploaded };
              });
            }),
          );

          // 추가 이미지 업로드
          const snapshot = extraImagesRef.current;
          const extraResults = await Promise.allSettled(
            extraUploads.map(async ({ localId, file }) => {
              const order = snapshot.findIndex((img) => img.id === localId);
              const uploaded = await uploadImageViaApi(
                currentProduct!.id, file, 'extra', order >= 0 ? order : undefined,
              );
              setExtraImages((prev) =>
                prev.map((img) => {
                  if (img.id !== localId) return img;
                  if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
                  return uploaded;
                }),
              );
            }),
          );

          const anyImageFailed = [...typedResults, ...extraResults].some(
            (r) => r.status === 'rejected',
          );
          if (anyImageFailed) {
            showToast('일부 이미지 처리에 실패했습니다. 다시 저장해주세요.', 'error');
          }
        }

        setHasPendingImages(false);

        // 대기 중인 재고 조정 순서대로 API 적용
        if (pendingStockAdjustments.length > 0) {
          const toApply = [...pendingStockAdjustments];
          setPendingStockAdjustments([]);
          let latestStock = stock;
          for (const adj of toApply) {
            try {
              latestStock = await adjustStock(
                currentProduct!.id,
                adj.type,
                adj.quantity,
                adj.reason || undefined,
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : '재고 조정에 실패했습니다.';
              showToast(msg, 'error');
              // 실패한 조정부터 다시 pending으로 복원
              const failedIndex = toApply.indexOf(adj);
              setPendingStockAdjustments(toApply.slice(failedIndex));
              throw e;
            }
          }
          setStock(latestStock);
          // 재고 이력 새로고침 (이미 열려있을 경우)
          if (historyOpen) {
            setHistoryItems([]);
            setHistoryOpen(false);
          }
        }

        initialDataRef.current = { ...formData };
        isDirtyRef.current = false;
        try { localStorage.removeItem(getDraftKey(currentProduct!.id)); } catch { /* 무시 */ }
        showToast('변경사항이 저장되었습니다.', 'success');
      }
    } catch {
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [validate, formData, currentIsNew, focusFirstError, currentProduct, stock, showToast, setSavedNewProduct, pendingStockAdjustments, historyOpen]);

  // ── 상품 삭제 ────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!currentProduct?.id) return;
    setIsDeleting(true);
    setShowDeleteModal(false);
    try {
      const res = await fetch(`/api/products/${currentProduct.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? '상품 삭제에 실패했습니다.');
      }
      isDirtyRef.current = false;
      router.push('/dashboard/products');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '상품 삭제에 실패했습니다.';
      showToast(msg, 'error');
      setIsDeleting(false);
    }
  }, [currentProduct?.id, router, showToast]);

  // ── 이미지 파일 검사 ──────────────────────────────────────
  const validateImageFile = useCallback((file: File): string | null => {
    if (!ALLOWED_MIME.has(file.type)) return 'JPG, PNG, GIF, WebP 파일만 업로드 가능합니다.';
    if (file.size > MAX_FILE_SIZE)    return `파일 크기는 10MB 이하여야 합니다. (현재: ${formatFileSize(file.size)})`;
    return null;
  }, []);

  // ── 규격 이미지 업로드 ────────────────────────────────────
  const handleTypedImageSelect = useCallback((file: File, imageType: Exclude<ImageType, 'extra'>) => {
    const err = validateImageFile(file);
    if (err) { showToast(err, 'error'); return; }

    const prev    = typedImages[imageType];
    const localId = `local-${imageType}-${Date.now()}`;
    const url     = URL.createObjectURL(file);

    if (currentIsNew) {
      // 신규 등록 중: 로컬 미리보기만 표시하고, 파일은 pending으로 보관
      if (prev?.url.startsWith('blob:')) URL.revokeObjectURL(prev.url);
      pendingTypedFilesRef.current[imageType] = file;
      setTypedImages((p) => ({
        ...p,
        [imageType]: { id: localId, type: imageType, url, fileName: file.name, fileSize: file.size, createdAt: new Date().toISOString() },
      }));
      return;
    }

    // 수정 모드: 즉시 API 호출 없이 pending으로 보관
    if (prev) {
      if (!prev.id.startsWith('local-')) {
        // 실제 DB 이미지 → 저장하기 시 삭제 대기열에 추가
        if (!pendingDeleteIdsRef.current.includes(prev.id)) {
          pendingDeleteIdsRef.current.push(prev.id);
        }
      } else if (prev.url.startsWith('blob:')) {
        // 이전에도 pending이었던 blob → revoke 후 파일 교체
        URL.revokeObjectURL(prev.url);
      }
    }

    pendingTypedEditRef.current[imageType] = file;
    setTypedImages((p) => ({
      ...p,
      [imageType]: { id: localId, type: imageType, url, fileName: file.name, fileSize: file.size, createdAt: new Date().toISOString() },
    }));
    setHasPendingImages(true);
    showToast('이미지가 대기 중입니다. 저장하기를 눌러 적용하세요.', 'info');
  }, [validateImageFile, showToast, typedImages, currentIsNew]);

  const handleTypedImageRemove = useCallback((imageType: Exclude<ImageType, 'extra'>) => {
    const target = typedImages[imageType];
    if (!target) return;

    if (target.url.startsWith('blob:')) URL.revokeObjectURL(target.url);

    if (currentIsNew) {
      // 신규: pending 파일도 제거
      delete pendingTypedFilesRef.current[imageType];
    } else if (target.id.startsWith('local-')) {
      // 수정 모드 pending 이미지 제거: 업로드 대기 파일도 제거
      delete pendingTypedEditRef.current[imageType];
    } else {
      // 수정 모드 실제 DB 이미지: 저장하기 시 삭제 대기열에 추가
      if (!pendingDeleteIdsRef.current.includes(target.id)) {
        pendingDeleteIdsRef.current.push(target.id);
      }
      setHasPendingImages(true);
    }

    setTypedImages((p) => { const n = { ...p }; delete n[imageType]; return n; });
  }, [typedImages, currentIsNew]);

  // ── 추가 이미지 업로드 ────────────────────────────────────
  const handleExtraFilesSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_EXTRA_IMGS - extraImages.length;
    if (remaining <= 0) { showToast('추가 이미지는 최대 20장까지 등록 가능합니다.', 'error'); return; }

    const validFiles: File[] = [];
    Array.from(files).slice(0, remaining).forEach((file) => {
      const err = validateImageFile(file);
      if (err) { showToast(err, 'error'); return; }
      validFiles.push(file);
    });
    if (validFiles.length === 0) return;

    if (currentIsNew) {
      // 신규 등록 중: 로컬 미리보기만 추가, 파일 pending 보관
      const toAdd: ProductImage[] = validFiles.map((file, i) => {
        const localId = `local-extra-${Date.now()}-${i}`;
        pendingExtraFilesRef.current.push({ localId, file });
        return {
          id: localId, type: 'extra', url: URL.createObjectURL(file),
          fileName: file.name, fileSize: file.size,
          order: extraImages.length + i, createdAt: new Date().toISOString(),
        };
      });
      setExtraImages((prev) => [...prev, ...toAdd]);
      return;
    }

    // 수정 모드: 즉시 API 호출 없이 pending으로 보관
    const toAdd: ProductImage[] = validFiles.map((file, i) => {
      const localId = `local-extra-${Date.now()}-${i}`;
      pendingExtraEditRef.current.push({ localId, file });
      return {
        id: localId, type: 'extra' as const,
        url: URL.createObjectURL(file),
        fileName: file.name, fileSize: file.size,
        order: extraImages.length + i,
        createdAt: new Date().toISOString(),
      };
    });
    setExtraImages((prev) => [...prev, ...toAdd]);
    setHasPendingImages(true);
    showToast('이미지가 대기 중입니다. 저장하기를 눌러 적용하세요.', 'info');
  }, [extraImages.length, validateImageFile, showToast, currentIsNew]);

  const handleExtraFileDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleExtraFilesSelect(e.dataTransfer.files);
  }, [handleExtraFilesSelect]);

  const handleExtraImageRemove = useCallback((id: string) => {
    const target = extraImages.find((img) => img.id === id);
    if (!target) return;

    if (target.url.startsWith('blob:')) URL.revokeObjectURL(target.url);

    if (currentIsNew) {
      // 신규: pending 파일도 제거
      pendingExtraFilesRef.current = pendingExtraFilesRef.current.filter((p) => p.localId !== id);
    } else if (target.id.startsWith('local-')) {
      // 수정 모드 pending 이미지 제거: 업로드 대기 파일도 제거
      pendingExtraEditRef.current = pendingExtraEditRef.current.filter((p) => p.localId !== id);
    } else {
      // 수정 모드 실제 DB 이미지: 저장하기 시 삭제 대기열에 추가
      if (!pendingDeleteIdsRef.current.includes(id)) {
        pendingDeleteIdsRef.current.push(id);
      }
      setHasPendingImages(true);
    }

    setExtraImages((prev) => prev.filter((img) => img.id !== id));
  }, [extraImages, currentIsNew]);

  // ── 추가 이미지 순서 변경 (드래그) ───────────────────────
  const handleExtraDragStart = useCallback((id: string) => { extraDragIdRef.current = id; }, []);
  const handleExtraDragOver  = useCallback((id: string) => { setExtraDragOver(id); }, []);
  const handleExtraDrop      = useCallback((targetId: string) => {
    const dragId = extraDragIdRef.current;
    if (!dragId || dragId === targetId) { setExtraDragOver(null); return; }
    setExtraImages((prev) => {
      const from = prev.findIndex((img) => img.id === dragId);
      const to   = prev.findIndex((img) => img.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((img, i) => ({ ...img, order: i }));
    });
    extraDragIdRef.current = null;
    setExtraDragOver(null);
  }, []);

  // ── 재고 조정 ────────────────────────────────────────────
  // 신규 상품: 저장 시 초기재고로 전달 (기존 동작 유지)
  // 기존 상품: 저장하기 클릭 시 일괄 적용 (pending에 누적)
  const handleStockAdjust = useCallback(() => {
    const qty = parseInt(adjustQuantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setAdjustError('수량은 1 이상 정수를 입력해주세요.');
      return;
    }
    if (adjustType === 'out' && qty > stock.available) {
      setAdjustError('가용 재고보다 많은 수량입니다.');
      return;
    }
    setAdjustError('');

    // 로컬 재고 preview 계산 (DB 반영은 저장하기 클릭 시)
    const next = { ...stock };
    if (adjustType === 'in') {
      next.total     += qty;
      next.available += qty;
    } else {
      next.total     -= qty;
      next.available -= qty;
    }
    setStock(next);

    if (!currentIsNew) {
      // 기존 상품: pending 목록에 추가 (저장하기 시 API 호출)
      setPendingStockAdjustments((prev) => [
        ...prev,
        { type: adjustType, quantity: qty, reason: adjustReason },
      ]);
    }

    setAdjustQuantity('');
    setAdjustReason('');
    showToast(
      currentIsNew
        ? '재고가 반영되었습니다. 저장 시 적용됩니다.'
        : '재고 조정이 대기 중입니다. 저장하기를 눌러 적용하세요.',
      'info',
    );
  }, [adjustQuantity, adjustType, adjustReason, stock, currentIsNew, showToast]);

  // ── 재고 이력 토글 ───────────────────────────────────────
  const handleHistoryToggle = useCallback(async () => {
    if (!historyOpen && historyItems.length === 0) {
      setHistoryLoading(true);
      try {
        const { items } = await getStockHistory(currentProduct?.id ?? '', 1, 20);
        setHistoryItems(items);
      } catch {
        showToast('재고 이력 조회에 실패했습니다.', 'error');
      } finally {
        setHistoryLoading(false);
      }
    }
    setHistoryOpen((prev) => !prev);
  }, [historyOpen, historyItems.length, currentProduct?.id, showToast]);

  // ── ID 복사 ──────────────────────────────────────────────
  const handleCopyId = useCallback(() => {
    if (!currentProduct?.id) return;
    navigator.clipboard.writeText(currentProduct.id).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  }, [currentProduct?.id]);

  // ── 가용재고 0 경고 배너 ─────────────────────────────────
  const showZeroStockWarning = useMemo(
    () => !currentIsNew && stock.available === 0 && formData.status !== 'sold_out',
    [currentIsNew, stock.available, formData.status],
  );

  // ── 가격 표시 포맷 (입력 중이 아닐 때) ───────────────────
  const priceDisplay = formData.price === '' ? '' : String(formData.price);

  // ── 클린업 ───────────────────────────────────────────────
  const typedImagesRef = useRef(typedImages);
  const extraImagesRef = useRef(extraImages);

  useEffect(() => { typedImagesRef.current = typedImages; }, [typedImages]);
  useEffect(() => { extraImagesRef.current = extraImages; }, [extraImages]);

  useEffect(() => {
    return () => {
      // 규격 이미지 정리 (ref를 통해 최신 값 참조)
      Object.values(typedImagesRef.current).forEach((img) => {
        if (img?.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
      });

      // 추가 이미지 정리
      extraImagesRef.current.forEach((img) => {
        if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
      });
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-md pb-xxl md:pb-md">

      {/* ── PageHeader ──────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-light-background dark:bg-dark-background border-b border-light-border dark:border-dark-border -mx-md px-md py-sm flex items-center gap-sm shadow-xs">
        {/* 뒤로가기 */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="상품 목록으로 이동"
          className="flex items-center gap-xs text-bodySm text-light-textSecondary dark:text-dark-textSecondary hover:text-light-primary dark:hover:text-dark-primary transition-colors flex-shrink-0"
        >
          <ArrowLeftOutlined aria-hidden="true" />
          <span className="hidden sm:inline">상품 목록</span>
        </button>

        {/* 타이틀 */}
        <h1 className="flex-1 min-w-0 text-bodyMd font-semibold text-light-textPrimary dark:text-dark-textPrimary truncate">
          {currentIsNew ? '새 상품 등록' : (formData.name || '상품 수정')}
        </h1>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-sm flex-shrink-0">
          {/* 임시저장 — 모바일에서는 아이콘만 */}
          <button
            type="button"
            onClick={handleDraftSave}
            disabled={isDraftSaving || isSaving}
            aria-label="임시저장"
            className="flex items-center gap-xs text-bodySm font-medium text-light-textSecondary dark:text-dark-textSecondary border border-light-border dark:border-dark-border rounded-md px-sm py-xs hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-50 transition-colors"
          >
            {isDraftSaving
              ? <LoadingOutlined aria-hidden="true" className="animate-spin" />
              : <CloudUploadOutlined aria-hidden="true" />
            }
            <span className="hidden sm:inline">임시저장</span>
          </button>

          {/* 저장 */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="저장하기"
            className="flex items-center gap-xs text-bodySm font-medium text-white bg-light-primary dark:bg-dark-primary rounded-md px-md py-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSaving
              ? <LoadingOutlined aria-hidden="true" className="animate-spin" />
              : <SaveOutlined aria-hidden="true" />
            }
            <span className="hidden sm:inline">저장하기</span>
          </button>

          {/* 삭제 (수정 모드만) */}
          {!currentIsNew && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              aria-label="상품 삭제"
              className="hidden md:flex items-center gap-xs text-bodySm font-medium text-light-error dark:text-dark-error border border-red-200 dark:border-red-900/30 rounded-md px-sm py-xs hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? <LoadingOutlined aria-hidden="true" className="animate-spin" /> : <DeleteOutlined aria-hidden="true" />}
              삭제
            </button>
          )}
        </div>
      </div>

      {/* ── 임시저장 복원 배너 ────────────────────────────── */}
      {draftBanner && (
        <div
          role="alert"
          className="flex items-center gap-sm px-md py-sm rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-bodySm text-light-info dark:text-dark-info"
        >
          <HistoryOutlined aria-hidden="true" />
          <span className="flex-1">임시 저장된 내용이 있습니다.</span>
          <button
            type="button"
            onClick={handleRestoreDraft}
            className="font-semibold underline hover:no-underline"
          >복원</button>
          <button
            type="button"
            onClick={handleIgnoreDraft}
            aria-label="임시저장 무시"
            className="ml-sm text-light-textSecondary dark:text-dark-textSecondary hover:text-light-error dark:hover:text-dark-error"
          >
            <CloseCircleOutlined />
          </button>
        </div>
      )}

      {/* ── 가용재고 0 경고 배너 ─────────────────────────── */}
      {showZeroStockWarning && (
        <div
          role="alert"
          className="flex items-center gap-sm px-md py-sm rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-bodySm text-light-warning dark:text-dark-warning"
        >
          <WarningOutlined aria-hidden="true" />
          가용 재고가 0입니다. 상태를 &lsquo;품절&rsquo;로 변경하는 것을 권장합니다.
          <button
            type="button"
            onClick={() => setField('status', 'sold_out')}
            className="ml-sm font-semibold underline hover:no-underline"
          >
            품절로 변경
          </button>
        </div>
      )}

      {/* ── 2-Column 레이아웃 ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-md items-start">

        {/* ── MainColumn ──────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-md">

          {/* ── 기본 정보 ────────────────────────────────── */}
          <SectionCard title="기본 정보">
            {/* 상품명 */}
            <FieldGroup
              id={fid('name')}
              label="상품명"
              required
              error={errors.name}
            >
              <div className="relative">
                <input
                  ref={nameRef}
                  id={fid('name')}
                  type="text"
                  value={formData.name}
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? `${fid('name')}-error` : undefined}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="상품명을 입력해주세요."
                  className={`${inputCls(!!errors.name)} pr-14`}
                />
                <span className="absolute right-sm top-1/2 -translate-y-1/2 text-caption text-light-textSecondary dark:text-dark-textSecondary pointer-events-none">
                  {formData.name.length}/100
                </span>
              </div>
            </FieldGroup>

            {/* 상품코드 + 판매가 */}
            <div className="flex flex-col sm:flex-row gap-md">
              {/* 상품코드 */}
              <FieldGroup
                id={fid('productCode')}
                label="상품코드"
                required
                error={errors.productCode}
              >
                <div className="flex gap-xs">
                  <input
                    ref={codeRef}
                    id={fid('productCode')}
                    type="text"
                    value={formData.productCode}
                    maxLength={50}
                    aria-required="true"
                    aria-invalid={!!errors.productCode}
                    aria-describedby={errors.productCode ? `${fid('productCode')}-error` : undefined}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setField('productCode', e.target.value.toUpperCase())}
                    onBlur={() => handleBlur('productCode')}
                    placeholder="예: PRD-ABC123"
                    className={inputCls(!!errors.productCode)}
                  />
                  <button
                    type="button"
                    onClick={handleCodeCheck}
                    disabled={codeCheck === 'checking'}
                    aria-label="상품코드 중복 확인"
                    className="flex-shrink-0 px-sm py-xs rounded-md border border-light-border dark:border-dark-border text-caption font-medium text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {codeCheck === 'checking' ? <LoadingOutlined className="animate-spin" /> : '중복확인'}
                  </button>
                </div>

                {/* 중복확인 결과 — available일 때만 성공 문구 인라인 표시 (에러는 FieldGroup error prop으로 표시) */}
                {codeCheck === 'available' && !errors.productCode && (
                  <p className="text-caption text-light-success dark:text-dark-success flex items-center gap-xs">
                    <CheckCircleOutlined aria-hidden="true" /> 사용 가능한 코드입니다.
                  </p>
                )}

                {/* 자동 생성 버튼 (신규 등록 시) */}
                {currentIsNew && (
                  <button
                    type="button"
                    onClick={handleAutoGenCode}
                    className="text-caption text-light-primary dark:text-dark-primary hover:underline self-start"
                  >
                    <SyncOutlined aria-hidden="true" className="mr-xs" />
                    코드 자동 생성
                  </button>
                )}
              </FieldGroup>

              {/* 판매가 */}
              <FieldGroup
                id={fid('price')}
                label="판매가"
                required
                error={errors.price}
              >
                <div className="relative">
                  <span className="absolute left-sm top-1/2 -translate-y-1/2 text-bodySm text-light-textSecondary dark:text-dark-textSecondary pointer-events-none">₩</span>
                  <input
                    ref={priceRef}
                    id={fid('price')}
                    type="number"
                    min={0}
                    step={1}
                    value={priceDisplay}
                    aria-required="true"
                    aria-invalid={!!errors.price}
                    aria-describedby={errors.price ? `${fid('price')}-error` : undefined}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const v = e.target.value;
                      if (v === '') { setField('price', ''); return; }
                      const n = parseInt(v, 10);
                      if (Number.isFinite(n) && n >= 0) setField('price', n);
                    }}
                    onBlur={() => handleBlur('price')}
                    placeholder="0"
                    className={`${inputCls(!!errors.price)} pl-6`}
                  />
                </div>
                {formData.price !== '' && formData.price > 0 && (
                  <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">
                    {formatPrice(formData.price)}
                  </p>
                )}
              </FieldGroup>
            </div>
          </SectionCard>

          {/* ── 상품 설명 ────────────────────────────────── */}
          <SectionCard title="상품 설명">
            {/* 요약 설명 */}
            <FieldGroup
              id={fid('summary')}
              label="상품 요약 설명"
              required
              hint="검색 결과 및 상품 상단에 표시되는 짧은 설명입니다."
            >
              <div className="relative">
                <input
                  id={fid('summary')}
                  type="text"
                  value={formData.summary}
                  maxLength={200}
                  aria-required="true"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField('summary', e.target.value)}
                  placeholder="요약 설명을 입력해주세요."
                  className={`${inputCls(false)} pr-16`}
                />
                <span className="absolute right-sm top-1/2 -translate-y-1/2 text-caption text-light-textSecondary dark:text-dark-textSecondary pointer-events-none">
                  {formData.summary.length}/200
                </span>
              </div>
            </FieldGroup>

            {/* 간단 설명 */}
            <FieldGroup
              id={fid('shortDesc')}
              label="상품 간단 설명"
              hint={`상품 카드 하단에 표시되는 간략한 설명입니다. (${formData.shortDescription.length}/500자)`}
            >
              <textarea
                id={fid('shortDesc')}
                value={formData.shortDescription}
                maxLength={500}
                rows={3}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('shortDescription', e.target.value)}
                placeholder="간단 설명을 입력해주세요."
                className={`${inputCls(false)} resize-none`}
              />
            </FieldGroup>

            {/* 상세 설명 (Rich Text — MVP: 스타일드 textarea) */}
            <FieldGroup
              id={fid('description')}
              label="상품 상세 설명"
              required
            >
              <div className="border border-light-border dark:border-dark-border rounded-md overflow-hidden">
                {/* 툴바 (장식용 MVP) */}
                <div className="flex flex-wrap gap-xs px-sm py-xs bg-light-secondary dark:bg-dark-secondary border-b border-light-border dark:border-dark-border">
                  {['B', 'I', 'U', 'H1', 'H2', '목록', '링크'].map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      aria-label={`서식 ${tool}`}
                      className="px-xs py-xs text-caption font-medium text-light-textSecondary dark:text-dark-textSecondary rounded hover:bg-light-border dark:hover:bg-dark-border transition-colors"
                      onClick={() => { /* 실제 구현 시 TipTap 등 연결 */ }}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
                <textarea
                  id={fid('description')}
                  value={formData.description}
                  rows={12}
                  aria-required="true"
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('description', e.target.value)}
                  placeholder="상품 상세 설명을 입력해주세요. HTML 태그를 직접 입력하거나 위 툴바를 사용하세요."
                  className="w-full px-sm py-sm text-bodySm text-light-textPrimary dark:text-dark-textPrimary bg-light-background dark:bg-dark-background focus:outline-none resize-none max-h-[600px] overflow-y-auto"
                />
              </div>
            </FieldGroup>
          </SectionCard>

          {/* ── 이미지 관리 ─────────────────────────────── */}
          <SectionCard title="이미지 관리">
            {/* 규격 이미지 */}
            <div>
              <p className="text-caption font-medium text-light-textSecondary dark:text-dark-textSecondary mb-sm">
                규격 이미지 · JPG, PNG, GIF, WebP · 최대 10MB · 1:1 비율 권장
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
                {(['main', 'list', 'small', 'thumbnail'] as const).map((t) => (
                  <ImageDropZone
                    key={t}
                    imageType={t}
                    image={typedImages[t] ?? null}
                    isUploading={false}
                    onFileSelect={handleTypedImageSelect}
                    onRemove={handleTypedImageRemove}
                  />
                ))}
              </div>
            </div>

            {/* 추가 이미지 */}
            <div>
              <div className="flex items-center justify-between mb-sm">
                <p className="text-caption font-medium text-light-textSecondary dark:text-dark-textSecondary">
                  추가 이미지 ({extraImages.length}/{MAX_EXTRA_IMGS}) · 드래그하여 순서 변경
                </p>
              </div>

              <div
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleExtraFileDrop}
              >
                {extraImages.map((img) => (
                  <ExtraImageCard
                    key={img.id}
                    image={img}
                    isDragOver={extraDragOver === img.id}
                    isUploading={false}
                    onRemove={handleExtraImageRemove}
                    onDragStart={handleExtraDragStart}
                    onDragOver={handleExtraDragOver}
                    onDrop={handleExtraDrop}
                  />
                ))}

                {/* 추가 버튼 */}
                {extraImages.length < MAX_EXTRA_IMGS && (
                  <button
                    type="button"
                    onClick={() => extraFileInputRef.current?.click()}
                    aria-label="추가 이미지 업로드"
                    className={[
                      'rounded-md border-2 border-dashed border-light-border dark:border-dark-border',
                      'flex flex-col items-center justify-center gap-xs aspect-square',
                      'text-light-textSecondary dark:text-dark-textSecondary',
                      'hover:border-light-primary dark:hover:border-dark-primary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors',
                    ].join(' ')}
                  >
                    <PlusOutlined className="text-bodyMd" aria-hidden="true" />
                    <span className="text-overline">이미지 추가</span>
                  </button>
                )}
              </div>
              <input
                ref={extraFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="sr-only"
                aria-hidden="true"
                onChange={(e) => { handleExtraFilesSelect(e.target.files); e.target.value = ''; }}
              />
            </div>
          </SectionCard>
        </div>

        {/* ── SideColumn ────────────────────────────────── */}
        <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-md lg:sticky lg:top-16">

          {/* ── 상품 상태 ──────────────────────────────── */}
          <SectionCard title="상품 상태">
            <div className="flex flex-col gap-sm" role="radiogroup" aria-label="상품 상태 선택">
              {(['active', 'hidden', 'sold_out'] as const).map((s) => {
                const cfg     = PRODUCT_STATUS_MAP[s];
                const checked = formData.status === s;
                return (
                  <label
                    key={s}
                    className={[
                      'flex items-start gap-sm p-sm rounded-md border cursor-pointer transition-colors',
                      checked
                        ? 'border-light-primary dark:border-dark-primary bg-light-secondary dark:bg-dark-secondary'
                        : 'border-light-border dark:border-dark-border hover:bg-light-secondary dark:hover:bg-dark-secondary',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={fid('status')}
                      value={s}
                      checked={checked}
                      onChange={() => setField('status', s)}
                      className="mt-xs accent-light-primary dark:accent-dark-primary flex-shrink-0"
                    />
                    <div>
                      <span className={`text-bodySm font-semibold ${cfg.badgeClass}`}>{cfg.label}</span>
                      <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary mt-xs">
                        {STATUS_DESCRIPTIONS[s]}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </SectionCard>

          {/* ── 재고 관리 ──────────────────────────────────── */}
          <SectionCard title="재고 관리">
            {/* 신규 등록 안내 */}
            {currentIsNew && (
              <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary bg-light-secondary dark:bg-dark-secondary rounded-md px-sm py-xs">
                초기 입고 수량을 미리 설정할 수 있습니다. 설정하지 않으면 재고 0으로 등록됩니다.
              </p>
            )}

            {/* 재고 현황 */}
            <div className="grid grid-cols-3 gap-xs text-center">
              {[
                { label: '전체 입고', value: stock.total },
                { label: '판매 수량', value: stock.sold },
                { label: '가용 재고', value: stock.available },
              ].map(({ label, value }) => (
                <div key={label} className="bg-light-background dark:bg-dark-background rounded-md py-sm px-xs">
                  <p className="text-caption text-light-textSecondary dark:text-dark-textSecondary">{label}</p>
                  <p className={`text-bodyMd font-bold mt-xs ${value === 0 ? 'text-light-error dark:text-dark-error' : 'text-light-textPrimary dark:text-dark-textPrimary'}`}>
                    {value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* 재고 조정 */}
            <div className="border-t border-light-border dark:border-dark-border pt-md flex flex-col gap-sm">
              <p className="text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary">재고 조정</p>

              {/* 입고/출고 라디오 — 신규 등록 시 입고만 허용 */}
              <div className="flex gap-sm" role="radiogroup" aria-label="재고 조정 유형">
                {(['in', 'out'] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-xs ${currentIsNew && t === 'out' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="radio"
                      name={fid('adjustType')}
                      value={t}
                      checked={adjustType === t}
                      disabled={currentIsNew && t === 'out'}
                      onChange={() => { setAdjustType(t); setAdjustError(''); }}
                      className="accent-light-primary dark:accent-dark-primary"
                    />
                    <span className="text-bodySm text-light-textPrimary dark:text-dark-textPrimary">
                      {t === 'in' ? '입고' : '출고'}
                    </span>
                  </label>
                ))}
              </div>

              {/* 수량 */}
              <div>
                <label htmlFor={fid('adjustQty')} className="text-caption text-light-textSecondary dark:text-dark-textSecondary block mb-xs">수량</label>
                <input
                  id={fid('adjustQty')}
                  type="number"
                  min={1}
                  step={1}
                  value={adjustQuantity}
                  onChange={(e) => { setAdjustQuantity(e.target.value); setAdjustError(''); }}
                  placeholder="조정 수량"
                  className={inputCls(!!adjustError)}
                />
              </div>

              {/* 사유 */}
              <div>
                <label htmlFor={fid('adjustReason')} className="text-caption text-light-textSecondary dark:text-dark-textSecondary block mb-xs">사유 (선택)</label>
                <input
                  id={fid('adjustReason')}
                  type="text"
                  maxLength={100}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="조정 사유를 입력하세요."
                  className={inputCls(false)}
                />
              </div>

              {adjustError && (
                <p role="alert" className="text-caption text-light-error dark:text-dark-error flex items-center gap-xs">
                  <ExclamationCircleOutlined aria-hidden="true" /> {adjustError}
                </p>
              )}

              <button
                type="button"
                onClick={handleStockAdjust}
                className="w-full py-xs text-bodySm font-medium text-white bg-light-primary dark:bg-dark-primary rounded-md hover:opacity-90 transition-opacity"
              >
                재고 조정 적용
              </button>

              {/* 저장 대기 중인 재고 조정 표시 */}
              {!currentIsNew && pendingStockAdjustments.length > 0 && (
                <div
                  role="alert"
                  className="flex items-center gap-xs px-sm py-xs rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-caption text-amber-700 dark:text-amber-400"
                >
                  <WarningOutlined aria-hidden="true" />
                  <span>
                    재고 조정 {pendingStockAdjustments.length}건 대기 중 —&nbsp;
                    <span className="font-semibold">저장하기</span>를 눌러야 실제 반영됩니다.
                  </span>
                </div>
              )}
            </div>

            {/* 재고 이력 아코디언 — 수정 모드에서만 표시 */}
            {!currentIsNew && (
              <div className="border-t border-light-border dark:border-dark-border pt-md">
                <button
                  type="button"
                  onClick={handleHistoryToggle}
                  aria-expanded={historyOpen}
                  className="w-full flex items-center justify-between text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                >
                  <span className="flex items-center gap-xs">
                    <HistoryOutlined aria-hidden="true" />
                    재고 이력 보기
                  </span>
                  {historyLoading
                    ? <LoadingOutlined className="animate-spin text-caption" aria-hidden="true" />
                    : historyOpen ? <UpOutlined className="text-caption" aria-hidden="true" /> : <DownOutlined className="text-caption" aria-hidden="true" />
                  }
                </button>

                {historyOpen && (
                  <div className="mt-sm max-h-[320px] overflow-x-auto overflow-y-auto sm:max-h-[360px] lg:max-h-[420px]">
                    <table className="w-full text-caption" aria-label="재고 이력">
                      <thead>
                        <tr className="text-light-textSecondary dark:text-dark-textSecondary border-b border-light-border dark:border-dark-border">
                          <th className="py-xs text-left font-medium whitespace-nowrap">날짜</th>
                          <th className="py-xs text-left font-medium">유형</th>
                          <th className="py-xs text-right font-medium">수량</th>
                          <th className="py-xs text-left font-medium">사유</th>
                          <th className="py-xs text-left font-medium">담당자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.map((h) => (
                          <tr key={h.id} className="border-b border-light-border/50 dark:border-dark-border/50 hover:bg-light-secondary dark:hover:bg-dark-secondary">
                            <td className="py-xs text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">{formatHistoryDate(h.createdAt)}</td>
                            <td className="py-xs">
                              <span className={h.type === 'in' ? 'text-light-success dark:text-dark-success font-medium' : 'text-light-error dark:text-dark-error font-medium'}>
                                {h.type === 'in' ? '입고' : '출고'}
                              </span>
                            </td>
                            <td className={`py-xs text-right font-medium whitespace-nowrap ${h.type === 'in' ? 'text-light-success dark:text-dark-success' : 'text-light-error dark:text-dark-error'}`}>
                              {h.type === 'in' ? '+' : '-'}{h.quantity}
                            </td>
                            <td className="py-xs text-light-textSecondary dark:text-dark-textSecondary">{h.reason ?? '-'}</td>
                            <td className="py-xs text-light-textSecondary dark:text-dark-textSecondary whitespace-nowrap">{h.operator}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {historyItems.length === 0 && (
                      <p className="text-caption text-center text-light-textSecondary dark:text-dark-textSecondary py-md">이력이 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ── 저장 정보 (수정 모드만) ─────────────────── */}
          {!currentIsNew && currentProduct && (
            <SectionCard title="정보">
              <dl className="flex flex-col gap-sm text-caption">
                <div className="flex items-center justify-between gap-sm">
                  <dt className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0">상품 ID</dt>
                  <dd className="flex items-center gap-xs font-medium text-light-textPrimary dark:text-dark-textPrimary truncate">
                    <span className="truncate">{currentProduct.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      aria-label="상품 ID 복사"
                      className="flex-shrink-0 text-light-textSecondary dark:text-dark-textSecondary hover:text-light-primary dark:hover:text-dark-primary transition-colors"
                    >
                      {copiedId
                        ? <CheckCircleOutlined className="text-light-success dark:text-dark-success" aria-hidden="true" />
                        : <CopyOutlined aria-hidden="true" />
                      }
                    </button>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-sm">
                  <dt className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0">등록일</dt>
                  <dd className="font-medium text-light-textPrimary dark:text-dark-textPrimary">{formatProductDate(currentProduct.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-sm">
                  <dt className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0">최종 수정일</dt>
                  <dd className="font-medium text-light-textPrimary dark:text-dark-textPrimary">{formatProductDate(currentProduct.updatedAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-sm">
                  <dt className="text-light-textSecondary dark:text-dark-textSecondary flex-shrink-0">등록자</dt>
                  <dd className="font-medium text-light-textPrimary dark:text-dark-textPrimary">{currentProduct.createdBy}</dd>
                </div>
              </dl>
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── 모바일 하단 Fixed 액션바 ──────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-sm px-md py-sm bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border shadow-lg md:hidden">
        <button
          type="button"
          onClick={handleDraftSave}
          disabled={isDraftSaving || isSaving}
          className="flex-1 py-sm rounded-md border border-light-border dark:border-dark-border text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-secondary dark:hover:bg-dark-secondary disabled:opacity-50 transition-colors"
        >
          {isDraftSaving ? <LoadingOutlined className="animate-spin mr-xs" /> : null}
          임시저장
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-sm rounded-md bg-light-primary dark:bg-dark-primary text-bodySm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSaving ? <LoadingOutlined className="animate-spin mr-xs" /> : null}
          저장하기
        </button>
      </div>

      {/* ── 이탈 확인 모달 ───────────────────────────────── */}
      {showLeaveModal && (
        <LeaveModal
          onStay={() => setShowLeaveModal(false)}
          onLeave={handleLeaveConfirm}
        />
      )}

      {/* ── 상품 삭제 확인 모달 ──────────────────────────── */}
      {showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => setShowDeleteModal(false)} />
          <div
            className={[
              'relative w-full bg-light-surface dark:bg-dark-surface shadow-xl z-10',
              'rounded-t-lg max-h-[85vh] px-md pt-xs pb-xl',
              'md:rounded-lg md:w-[420px] md:px-lg md:pt-lg md:pb-lg',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-sm pb-md md:hidden" aria-hidden="true">
              <div className="w-9 h-1 rounded-full bg-light-border dark:bg-dark-border" />
            </div>
            <h2 id="delete-modal-title" className="text-bodyMd font-semibold text-light-textPrimary dark:text-dark-textPrimary mb-sm">
              상품을 삭제하시겠습니까?
            </h2>
            <p className="text-bodySm text-light-textSecondary dark:text-dark-textSecondary mb-lg">
              <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">{currentProduct?.name}</span> 상품과 모든 이미지, 재고 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-sm px-md rounded-md border border-light-border dark:border-dark-border text-bodySm font-medium text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-sm px-md rounded-md bg-light-error dark:bg-dark-error text-bodySm font-medium text-white hover:opacity-90 transition-opacity"
              >
                삭제
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── 토스트 ───────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'fixed bottom-20 md:bottom-md left-1/2 -translate-x-1/2 z-50',
            'px-lg py-sm rounded-lg shadow-lg text-bodySm font-medium text-white',
            'flex items-center gap-sm whitespace-nowrap',
            'animate-modal-fade-scale',
            toast.type === 'success' ? 'bg-light-success dark:bg-dark-success' :
            toast.type === 'error'   ? 'bg-light-error dark:bg-dark-error' :
                                       'bg-light-info dark:bg-dark-info',
          ].join(' ')}
        >
          {toast.type === 'success' && <CheckCircleOutlined aria-hidden="true" />}
          {toast.type === 'error'   && <CloseCircleOutlined aria-hidden="true" />}
          {toast.type === 'info'    && <HistoryOutlined aria-hidden="true" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};
