import QRCode from 'qrcode'

/**
 * 本地生成二维码 Data URL，避免依赖第三方服务
 */
export async function generateQRCodeDataUrl(data: string, size = 200): Promise<string> {
  if (!data) return ''
  try {
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    })
  } catch {
    return ''
  }
}
