const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateLoginInput(email: string, password: string) {
  if (!email.trim()) return 'Nhập địa chỉ email của bạn.';
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) return 'Email chưa đúng định dạng.';
  if (!password) return 'Nhập mật khẩu để tiếp tục.';
  return null;
}

export function validateRegistrationInput(name: string, email: string, password: string, confirmPassword: string) {
  const displayName = name.trim();
  if (displayName.length < 2) return 'Tên hiển thị cần có ít nhất 2 ký tự.';
  if (displayName.length > 50) return 'Tên hiển thị tối đa 50 ký tự.';
  if (!EMAIL_PATTERN.test(normalizeEmail(email))) return 'Email chưa đúng định dạng.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Mật khẩu cần có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (password.length > 72) return 'Mật khẩu tối đa 72 ký tự.';
  if (password !== confirmPassword) return 'Mật khẩu xác nhận chưa khớp.';
  return null;
}
