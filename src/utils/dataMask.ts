// 电话号码脱敏
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 根据权限决定是否脱敏
export function displayPhone(phone: string, hasPermission: boolean): string {
  return hasPermission ? phone : maskPhone(phone)
}

// 身份证脱敏
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 18) return idCard
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

// 地址脱敏(只显示省市)
export function maskAddress(address: string): string {
  if (!address) return address
  const parts = address.split(/[省市区县]/)
  if (parts.length < 2) return address
  return parts.slice(0, 2).join('') + '***'
}
