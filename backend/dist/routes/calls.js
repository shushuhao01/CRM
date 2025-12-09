"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const Call_1 = require("../entities/Call");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// 获取通话统计数据
router.get('/statistics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const callRepository = database_1.AppDataSource.getRepository(Call_1.Call);
        const queryBuilder = callRepository.createQueryBuilder('call');
        if (startDate && endDate) {
            queryBuilder.where('call.createdAt BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            });
        }
        const totalCalls = await queryBuilder.getCount();
        const successfulCalls = await queryBuilder.clone()
            .andWhere('call.status = :status', { status: 'completed' })
            .getCount();
        const failedCalls = await queryBuilder.clone()
            .andWhere('call.status IN (:...statuses)', { statuses: ['failed', 'missed', 'busy'] })
            .getCount();
        // 计算平均通话时长
        const avgResult = await queryBuilder.clone()
            .select('AVG(call.duration)', 'avgDuration')
            .getRawOne();
        res.json({
            success: true,
            data: {
                totalCalls,
                successfulCalls,
                failedCalls,
                averageDuration: Math.round(avgResult?.avgDuration || 0)
            }
        });
    }
    catch (error) {
        console.error('获取通话统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取通话统计数据失败'
        });
    }
});
// 获取通话记录列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, startDate, endDate, keyword } = req.query;
        const callRepository = database_1.AppDataSource.getRepository(Call_1.Call);
        const queryBuilder = callRepository.createQueryBuilder('call');
        if (status) {
            queryBuilder.andWhere('call.status = :status', { status });
        }
        if (startDate && endDate) {
            queryBuilder.andWhere('call.createdAt BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            });
        }
        if (keyword) {
            queryBuilder.andWhere('(call.phoneNumber LIKE :keyword OR call.notes LIKE :keyword)', {
                keyword: `%${keyword}%`
            });
        }
        queryBuilder.orderBy('call.createdAt', 'DESC');
        queryBuilder.skip((Number(page) - 1) * Number(limit));
        queryBuilder.take(Number(limit));
        const [records, total] = await queryBuilder.getManyAndCount();
        res.json({
            success: true,
            data: {
                total,
                page: Number(page),
                limit: Number(limit),
                records
            }
        });
    }
    catch (error) {
        console.error('获取通话记录列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取通话记录列表失败'
        });
    }
});
// 创建通话记录
router.post('/', async (req, res) => {
    try {
        const callRepository = database_1.AppDataSource.getRepository(Call_1.Call);
        const { customerId, phoneNumber, duration, status, notes } = req.body;
        const currentUser = req.user;
        const call = callRepository.create({
            customerId,
            userId: currentUser?.userId,
            phoneNumber,
            duration: duration || 0,
            status: status || 'completed',
            notes
        });
        const savedCall = await callRepository.save(call);
        res.status(201).json({
            success: true,
            message: '通话记录创建成功',
            data: savedCall
        });
    }
    catch (error) {
        console.error('创建通话记录失败:', error);
        res.status(500).json({
            success: false,
            message: '创建通话记录失败'
        });
    }
});
// 导出通话记录
router.get('/export', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                url: '',
                filename: `calls_export_${Date.now()}.xlsx`
            }
        });
    }
    catch (error) {
        console.error('导出通话记录失败:', error);
        res.status(500).json({
            success: false,
            message: '导出通话记录失败'
        });
    }
});
exports.default = router;
//# sourceMappingURL=calls.js.map