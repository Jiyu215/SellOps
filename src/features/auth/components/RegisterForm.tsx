'use client'

import { useState } from 'react'
import Link from 'next/link'

export const RegisterForm = () => {
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')
  const [successEmail, setSuccessEmail] = useState('')

  const inputStyle: React.CSSProperties = {
    height: '44px',
    padding: '0 14px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#5D5FEF'
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(93,95,239,0.15)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = ''
    e.currentTarget.style.boxShadow   = ''
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')

    if (password !== confirm) {
      setErrorMsg('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 8) {
      setErrorMsg('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name.trim() || undefined }),
      })
      const data = await res.json() as { success: boolean; error?: string }

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? '등록에 실패했습니다.')
        return
      }

      setSuccessEmail(email)
      setName('')
      setEmail('')
      setPassword('')
      setConfirm('')
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ minHeight: '100vh' }}
      className="flex items-center justify-center bg-light-background dark:bg-dark-background px-4"
    >
      <div className="w-full" style={{ maxWidth: '520px' }}>

        {/* 로고 */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.svg"
            alt="SellOps"
            style={{ height: '40px' }}
            className="inline-block"
          />
        </div>

        <div
          className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg"
          style={{ padding: '40px 48px' }}
        >
          {/* 헤더 */}
          <div style={{ marginBottom: '32px' }}>
            <h1
              className="font-bold text-light-textPrimary dark:text-dark-textPrimary"
              style={{ fontSize: '24px', lineHeight: '32px', marginBottom: '6px' }}
            >
              운영자 계정 등록
            </h1>
            <p
              className="text-light-textSecondary dark:text-dark-textSecondary"
              style={{ fontSize: '14px' }}
            >
              새 운영자 계정을 생성합니다. 로그인한 관리자만 실행할 수 있습니다.
            </p>
          </div>

          {/* 등록 성공 */}
          {successEmail && (
            <div>
              <div
                className="rounded-md"
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(40,167,69,0.08)',
                  border: '1px solid rgba(40,167,69,0.3)',
                  color: '#28A745',
                  fontSize: '14px',
                  marginBottom: '24px',
                }}
                role="status"
              >
                <strong>{successEmail}</strong> 계정이 생성되었습니다.
              </div>
              <button
                type="button"
                onClick={() => setSuccessEmail('')}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: '#5D5FEF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                추가 계정 등록
              </button>
              <Link
                href="/dashboard/dashboard"
                className="block text-center text-light-textSecondary dark:text-dark-textSecondary hover:underline"
                style={{ fontSize: '14px' }}
              >
                대시보드로 돌아가기
              </Link>
            </div>
          )}

          {/* 등록 폼 */}
          {!successEmail && (
            <form onSubmit={handleSubmit}>

              {/* 이름 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="reg-name"
                  className="block font-medium text-light-textPrimary dark:text-dark-textPrimary"
                  style={{ fontSize: '14px', marginBottom: '6px' }}
                >
                  이름 <span className="text-light-textSecondary dark:text-dark-textSecondary font-normal">(선택)</span>
                </label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-textPrimary dark:text-dark-textPrimary"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* 이메일 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="reg-email"
                  className="block font-medium text-light-textPrimary dark:text-dark-textPrimary"
                  style={{ fontSize: '14px', marginBottom: '6px' }}
                >
                  이메일 <span style={{ color: '#DC3545' }}>*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@sellops.com"
                  className="w-full rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-textPrimary dark:text-dark-textPrimary"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  aria-required="true"
                />
              </div>

              {/* 비밀번호 */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="reg-password"
                  className="block font-medium text-light-textPrimary dark:text-dark-textPrimary"
                  style={{ fontSize: '14px', marginBottom: '6px' }}
                >
                  비밀번호 <span style={{ color: '#DC3545' }}>*</span>
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상"
                  className="w-full rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-textPrimary dark:text-dark-textPrimary"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  aria-required="true"
                />
              </div>

              {/* 비밀번호 확인 */}
              <div style={{ marginBottom: '8px' }}>
                <label
                  htmlFor="reg-confirm"
                  className="block font-medium text-light-textPrimary dark:text-dark-textPrimary"
                  style={{ fontSize: '14px', marginBottom: '6px' }}
                >
                  비밀번호 확인 <span style={{ color: '#DC3545' }}>*</span>
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-textPrimary dark:text-dark-textPrimary"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  aria-required="true"
                />
              </div>

              {/* 에러 */}
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-md"
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(220,53,69,0.08)',
                    border: '1px solid rgba(220,53,69,0.25)',
                    color: '#DC3545',
                    fontSize: '13px',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* 등록 버튼 */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '24px',
                  width: '100%',
                  height: '46px',
                  backgroundColor: loading ? '#9496C8' : '#5D5FEF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s',
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#4A4DD1' }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#5D5FEF' }}
              >
                {loading ? '등록 중...' : '운영자 계정 등록'}
              </button>

              <Link
                href="/dashboard/dashboard"
                className="block text-center text-light-textSecondary dark:text-dark-textSecondary hover:underline"
                style={{ fontSize: '14px', marginTop: '16px' }}
              >
                대시보드로 돌아가기
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
