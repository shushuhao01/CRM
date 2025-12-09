"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// 下载Android APK
router.get('/download/android', (req, res) => {
    const apkPath = path_1.default.join(__dirname, '../../../public/downloads/CRM-Mobile-SDK-v2.1.3.apk');
    // 检查文件是否存在
    if (!fs_1.default.existsSync(apkPath)) {
        return res.status(404).json({
            success: false,
            message: 'APK文件不存在，请先构建应用'
        });
    }
    // 设置下载头
    res.setHeader('Content-Disposition', 'attachment; filename="CRM-Mobile-SDK-v2.1.3.apk"');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    // 发送文件
    return res.sendFile(apkPath, (err) => {
        if (err) {
            console.error('发送APK文件失败:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: '下载失败'
                });
            }
        }
    });
});
// 下载iOS IPA
router.get('/download/ios', (req, res) => {
    const ipaPath = path_1.default.join(__dirname, '../../../mobile-sdk/ios/build/CRM-Mobile-SDK-1.0.0.ipa');
    // 检查文件是否存在
    if (!fs_1.default.existsSync(ipaPath)) {
        return res.status(404).json({
            success: false,
            message: 'IPA文件不存在，iOS版本正在开发中'
        });
    }
    // 设置下载头
    res.setHeader('Content-Disposition', 'attachment; filename="CRM-Mobile-SDK-1.0.0.ipa"');
    res.setHeader('Content-Type', 'application/octet-stream');
    // 发送文件
    return res.sendFile(ipaPath, (err) => {
        if (err) {
            console.error('发送IPA文件失败:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: '下载失败'
                });
            }
        }
    });
});
// 格式化文件大小
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
// 获取SDK信息
router.get('/info', (req, res) => {
    const androidApkPath = path_1.default.join(__dirname, '../../../public/downloads/CRM-Mobile-SDK-v2.1.3.apk');
    const iosIpaPath = path_1.default.join(__dirname, '../../../mobile-sdk/ios/build/CRM-Mobile-SDK-1.0.0.ipa');
    const androidExists = fs_1.default.existsSync(androidApkPath);
    const iosExists = fs_1.default.existsSync(iosIpaPath);
    const androidStats = androidExists ? fs_1.default.statSync(androidApkPath) : null;
    const iosStats = iosExists ? fs_1.default.statSync(iosIpaPath) : null;
    const info = {
        android: {
            available: androidExists,
            size: androidStats ? androidStats.size : 0,
            fileSizeFormatted: androidStats ? formatFileSize(androidStats.size) : '未知',
            version: '2.1.3',
            lastModified: androidStats ? androidStats.mtime : null,
            supportedSystems: 'Android 5.0+',
            packageType: 'APK',
            fileName: 'CRM-Mobile-SDK-v2.1.3.apk'
        },
        ios: {
            available: iosExists,
            size: iosStats ? iosStats.size : 0,
            fileSizeFormatted: iosStats ? formatFileSize(iosStats.size) : '待发布',
            version: '1.0.0',
            lastModified: iosStats ? iosStats.mtime : null,
            supportedSystems: 'iOS 12.0+',
            packageType: 'IPA',
            fileName: 'CRM-Mobile-SDK-1.0.0.ipa'
        }
    };
    res.json({
        success: true,
        data: info
    });
});
exports.default = router;
//# sourceMappingURL=mobile-sdk.js.map