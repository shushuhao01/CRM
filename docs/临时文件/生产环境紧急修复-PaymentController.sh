#!/bin/bash

# 生产环境紧急修复 - PaymentController TypeScript错误
# 2026-03-05

echo "开始修复 PaymentController.ts..."

cd /www/wwwroot/abc789.cn/backend

# 备份原文件
cp src/controllers/admin/PaymentController.ts src/controllers/admin/PaymentController.ts.backup

# 修复第531行 - approveTransfer方法
sed -i '531,537s/await paymentService.updateOrderStatus(id, '\''paid'\'', {$/await paymentService.updateOrderStatus(id, '\''paid'\'', {/' src/controllers/admin/PaymentController.ts
sed -i '532s/paidAt: new Date()$/paidAt: new Date(),/' src/controllers/admin/PaymentController.ts
sed -i '533a\        tradeNo: undefined,\n        refundAmount: undefined,\n        refundAt: undefined,\n        refundReason: undefined' src/controllers/admin/PaymentController.ts

# 修复第579行 - rejectTransfer方法  
sed -i '583,589s/await paymentService.updateOrderStatus(id, '\''review_rejected'\'', {});$/await paymentService.updateOrderStatus(id, '\''review_rejected'\'', {\n        tradeNo: undefined,\n        paidAt: undefined,\n        refundAmount: undefined,\n        refundAt: undefined,\n        refundReason: undefined\n      });/' src/controllers/admin/PaymentController.ts

echo "修复完成！"
echo "开始构建..."

npm run build

if [ $? -eq 0 ]; then
    echo "构建成功！"
    echo "重启服务..."
    pm2 restart abc789.cn-backend
    echo "服务已重启！"
else
    echo "构建失败！恢复备份..."
    cp src/controllers/admin/PaymentController.ts.backup src/controllers/admin/PaymentController.ts
    echo "已恢复备份文件"
fi
