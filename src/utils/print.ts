/**
 * 打印工具
 * 🔥 批次273新增：支持使用系统基本设置的公司信息
 */
import { useConfigStore } from '@/stores/config'

/**
 * 生成打印页眉
 */
export const generatePrintHeader = (): string => {
  const configStore = useConfigStore()
  const config = configStore.systemConfig

  return `
    <div class="print-header">
      ${config.systemLogo ? `<img src="${config.systemLogo}" class="print-logo" alt="Logo" />` : ''}
      <div class="print-company-info">
        <h2>${config.companyName}</h2>
        <p>${config.contactPhone} | ${config.contactEmail}</p>
      </div>
    </div>
  `
}

/**
 * 生成打印页脚
 */
export const generatePrintFooter = (): string => {
  const configStore = useConfigStore()
  const config = configStore.systemConfig

  return `
    <div class="print-footer">
      <p>${config.companyAddress}</p>
      <p>${config.websiteUrl}</p>
      <p>© ${new Date().getFullYear()} ${config.companyName}. All rights reserved.</p>
    </div>
  `
}

/**
 * 打印文档
 * @param content 文档内容HTML
 * @param title 文档标题
 * @param options 打印选项
 */
export const printDocument = (
  content: string,
  title: string = '打印文档',
  options: {
    showHeader?: boolean
    showFooter?: boolean
    customStyles?: string
  } = {}
) => {
  const { showHeader = true, showFooter = true, customStyles = '' } = options

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    console.error('无法打开打印窗口')
    return
  }

  const header = showHeader ? generatePrintHeader() : ''
  const footer = showFooter ? generatePrintFooter() : ''

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, "Microsoft YaHei", sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          padding: 20px;
        }

        @media print {
          body {
            padding: 0;
          }

          .print-header {
            display: flex;
            align-items: center;
            padding: 20px;
            border-bottom: 2px solid #333;
            margin-bottom: 20px;
          }

          .print-logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
            margin-right: 20px;
          }

          .print-company-info h2 {
            margin: 0 0 8px 0;
            font-size: 20px;
            color: #303133;
          }

          .print-company-info p {
            margin: 0;
            font-size: 12px;
            color: #666;
          }

          .print-content {
            padding: 0 20px;
          }

          .print-footer {
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }

          .print-footer p {
            margin: 4px 0;
          }

          @page {
            margin: 1cm;
          }
        }

        ${customStyles}
      </style>
    </head>
    <body>
      ${header}
      <div class="print-content">
        ${content}
      </div>
      ${footer}
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()

  // 等待内容加载完成后打印
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 500)
}

/**
 * 打印订单
 * @param orderData 订单数据
 */
export const printOrder = (orderData: any) => {
  const content = `
    <div class="order-print">
      <h1 style="text-align: center; margin-bottom: 20px;">订单详情</h1>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;"><strong>订单号：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;">${orderData.orderNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;"><strong>下单时间：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;">${orderData.createTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>客户姓名：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${orderData.customerName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>联系电话：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${orderData.customerPhone}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>收货人：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${orderData.receiverName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>收货电话：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${orderData.receiverPhone}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>收货地址：</strong></td>
          <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${orderData.receiverAddress}</td>
        </tr>
      </table>

      <h3 style="margin: 20px 0 10px 0;">商品清单</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f7fa;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">商品名称</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">数量</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">单价</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">小计</th>
          </tr>
        </thead>
        <tbody>
          ${orderData.products.map((p: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.quantity}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${p.price.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${p.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #f5f7fa; font-weight: bold;">
            <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">合计：</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${orderData.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${orderData.remark ? `
        <div style="margin-top: 20px;">
          <strong>备注：</strong>
          <p style="margin: 8px 0; padding: 12px; background: #f5f7fa; border-radius: 4px;">${orderData.remark}</p>
        </div>
      ` : ''}
    </div>
  `

  printDocument(content, `订单_${orderData.orderNumber}`)
}

/**
 * 打印发货单
 * @param shipmentData 发货单数据
 */
export const printShipment = (shipmentData: any) => {
  const content = `
    <div class="shipment-print">
      <h1 style="text-align: center; margin-bottom: 20px;">发货单</h1>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;"><strong>发货单号：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;">${shipmentData.shipmentNumber}</td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;"><strong>发货时间：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; width: 25%;">${shipmentData.shipmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>订单号：</strong></td>
          <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${shipmentData.orderNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>收货人：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${shipmentData.receiverName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>联系电话：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${shipmentData.receiverPhone}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>收货地址：</strong></td>
          <td colspan="3" style="padding: 8px; border: 1px solid #ddd;">${shipmentData.receiverAddress}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>物流公司：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${shipmentData.logisticsCompany}</td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>物流单号：</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${shipmentData.trackingNumber}</td>
        </tr>
      </table>

      <h3 style="margin: 20px 0 10px 0;">商品清单</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f7fa;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">商品名称</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">数量</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">单价</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">小计</th>
          </tr>
        </thead>
        <tbody>
          ${shipmentData.products.map((p: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.quantity}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${p.price.toFixed(2)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${p.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${shipmentData.remark ? `
        <div style="margin-top: 20px;">
          <strong>备注：</strong>
          <p style="margin: 8px 0; padding: 12px; background: #f5f7fa; border-radius: 4px;">${shipmentData.remark}</p>
        </div>
      ` : ''}
    </div>
  `

  printDocument(content, `发货单_${shipmentData.shipmentNumber}`)
}
