import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { LogisticsTracking, LogisticsStatus } from '../entities/LogisticsTracking';
import { LogisticsTrace } from '../entities/LogisticsTrace';
import { Order } from '../entities/Order';
import { Like, In, Between } from 'typeorm';
import { ExpressAPIService } from '../services/ExpressAPIService';
import { logger } from '../config/logger';

export class LogisticsController {
  private expressAPIService = ExpressAPIService.getInstance();

  private get logisticsTrackingRepository() {
    return AppDataSource!.getRepository(LogisticsTracking);
  }

  private get logisticsTraceRepository() {
    return AppDataSource!.getRepository(LogisticsTrace);
  }

  private get orderRepository() {
    return AppDataSource!.getRepository(Order);
  }

  // 获取物流列表
  async getLogisticsList(req: Request, res: Response) {
    try {
      const {
        page = 1,
        pageSize = 20,
        trackingNo,
        companyCode,
        status,
        startDate,
        endDate,
        orderId
      } = req.query;

      const queryBuilder = this.logisticsTrackingRepository
        .createQueryBuilder('logistics')
        .leftJoinAndSelect('logistics.order', 'order')
        .leftJoinAndSelect('order.customer', 'customer');

      // 搜索条件
      if (trackingNo) {
        queryBuilder.andWhere('logistics.trackingNo LIKE :trackingNo', { 
          trackingNo: `%${trackingNo}%` 
        });
      }

      if (companyCode) {
        queryBuilder.andWhere('logistics.companyCode = :companyCode', { companyCode });
      }

      if (status) {
        queryBuilder.andWhere('logistics.status = :status', { status });
      }

      if (orderId) {
        queryBuilder.andWhere('logistics.orderId = :orderId', { orderId });
      }

      if (startDate && endDate) {
        queryBuilder.andWhere('logistics.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate
        });
      }

      // 分页
      const skip = (Number(page) - 1) * Number(pageSize);
      queryBuilder.skip(skip).take(Number(pageSize));

      // 排序
      queryBuilder.orderBy('logistics.updatedAt', 'DESC');

      const [list, total] = await queryBuilder.getManyAndCount();

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list,
          total,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      });
    } catch (error) {
      console.error('获取物流列表失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取物流列表失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 创建物流跟踪
  async createLogisticsTracking(req: Request, res: Response) {
    try {
      const {
        orderId,
        trackingNo,
        companyCode,
        companyName
      } = req.body;

      // 检查订单是否存在
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (!order) {
        return res.status(404).json({
          code: 404,
          message: '订单不存在'
        });
      }

      // 检查是否已存在相同的物流跟踪
      const existingTracking = await this.logisticsTrackingRepository.findOne({
        where: { orderId, trackingNo }
      });

      if (existingTracking) {
        return res.status(400).json({
          code: 400,
          message: '该订单的物流跟踪已存在'
        });
      }

      // 创建物流跟踪
      const logisticsTracking = this.logisticsTrackingRepository.create({
        orderId,
        trackingNo,
        companyCode,
        companyName,
        status: LogisticsStatus.PENDING,
        autoSyncEnabled: true,
        nextSyncTime: new Date(Date.now() + 5 * 60 * 1000) // 5分钟后同步
      });

      const savedTracking = await this.logisticsTrackingRepository.save(logisticsTracking);

      // 立即查询一次物流信息
      await this.queryLogisticsInfo(savedTracking.id);

      return res.json({
        code: 200,
        message: '创建成功',
        data: savedTracking
      });
    } catch (error) {
      console.error('创建物流跟踪失败:', error);
      return res.status(500).json({
        code: 500,
        message: '创建物流跟踪失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 查询物流轨迹
  async getLogisticsTrace(req: Request, res: Response) {
    try {
      const { trackingNo, companyCode } = req.query;

      if (!trackingNo) {
        return res.status(400).json({
          code: 400,
          message: '物流单号不能为空'
        });
      }

      // 查找物流跟踪记录
      const tracking = await this.logisticsTrackingRepository.findOne({
        where: { trackingNo: trackingNo as string },
        relations: ['traces', 'order', 'order.customer']
      });

      if (!tracking) {
        // 如果没有记录，尝试直接查询API
        const apiResult = await this.expressAPIService.queryExpress(trackingNo as string, companyCode as string || 'auto');
        return res.json({
          code: 200,
          message: '查询成功',
          data: apiResult
        });
      }

      // 如果记录存在但需要更新，则查询最新信息
      const now = new Date();
      if (!tracking.nextSyncTime || now >= tracking.nextSyncTime) {
        await this.queryLogisticsInfo(tracking.id);
        
        // 重新获取更新后的数据
        const updatedTracking = await this.logisticsTrackingRepository.findOne({
          where: { id: tracking.id },
          relations: ['traces', 'order', 'order.customer']
        });

        return res.json({
          code: 200,
          message: '查询成功',
          data: updatedTracking
        });
      }

      return res.json({
        code: 200,
        message: '查询成功',
        data: tracking
      });
    } catch (error) {
      console.error('查询物流轨迹失败:', error);
      return res.status(500).json({
        code: 500,
        message: '查询物流轨迹失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 批量同步物流状态
  async batchSyncLogistics(req: Request, res: Response) {
    try {
      const { trackingNumbers } = req.body;

      if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '请提供有效的运单号列表'
        });
      }

      const results = await Promise.allSettled(
        trackingNumbers.map(async (trackingNo: string) => {
          const tracking = await this.logisticsTrackingRepository.findOne({
            where: { trackingNo: trackingNo }
          });
          
          if (tracking) {
            return this.queryLogisticsInfo(tracking.id);
          }
          return null;
        })
      );

      return res.json({
        code: 200,
        message: '批量同步完成',
        data: results
      });
    } catch (error) {
      console.error('批量同步物流状态失败:', error);
      return res.status(500).json({
        code: 500,
        message: '批量同步物流状态失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 更新物流状态
  async updateLogisticsStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, remark } = req.body;

      const tracking = await this.logisticsTrackingRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!tracking) {
        return res.status(404).json({
          code: 404,
          message: '物流跟踪记录不存在'
        });
      }

      // 更新状态
      tracking.status = status;
      tracking.updatedAt = new Date();

      await this.logisticsTrackingRepository.save(tracking);

      return res.json({
        code: 200,
        message: '物流状态更新成功',
        data: tracking
      });
    } catch (error) {
      console.error('更新物流状态失败:', error);
      return res.status(500).json({
        code: 500,
        message: '更新物流状态失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 查询物流信息（内部方法）
  private async queryLogisticsInfo(trackingId: number) {
    try {
      const tracking = await this.logisticsTrackingRepository.findOne({
        where: { id: trackingId }
      });

      if (!tracking) {
        throw new Error('物流跟踪记录不存在');
      }

      // 调用快递API
      const apiResult = await this.expressAPIService.queryExpress(tracking.trackingNo, tracking.companyCode);

      // 更新物流跟踪状态
      await this.logisticsTrackingRepository.update(trackingId, {
        status: this.mapApiStatusToLogisticsStatus(apiResult.status),
        currentLocation: apiResult.currentLocation,
        statusDescription: apiResult.statusDescription,
        lastUpdateTime: new Date(),
        nextSyncTime: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后再次同步
        syncFailureCount: 0,
        lastSyncError: apiResult.success ? undefined : apiResult.error
      });

      // 保存轨迹记录
      if (apiResult.traces && apiResult.traces.length > 0) {
        // 删除旧的轨迹记录
        await this.logisticsTraceRepository.delete({ logisticsTrackingId: trackingId });

        // 插入新的轨迹记录
        const traces = apiResult.traces.map(trace => ({
          logisticsTrackingId: trackingId,
          traceTime: new Date(trace.time),
          location: trace.location,
          description: trace.description,
          status: trace.status,
          operator: trace.operator,
          phone: trace.phone,
          rawData: trace
        }));

        await this.logisticsTraceRepository.save(traces);
      }

      return apiResult;
    } catch (error) {
      // 更新同步失败信息
      await this.logisticsTrackingRepository.update(trackingId, {
        syncFailureCount: () => 'syncFailureCount + 1',
        lastSyncError: error instanceof Error ? error.message : String(error),
        nextSyncTime: new Date(Date.now() + 30 * 60 * 1000) // 失败后30分钟再试
      });
      throw error;
    }
  }

  // 获取支持的快递公司列表
  async getSupportedCompanies(req: Request, res: Response) {
    try {
      const companies = this.expressAPIService.getSupportedCompanies();
      const configStatus = this.expressAPIService.getConfigStatus();

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          companies,
          configStatus
        }
      });
    } catch (error) {
      console.error('获取支持的快递公司失败:', error);
      res.status(500).json({
        code: 500,
        message: '获取支持的快递公司失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 映射API状态到内部状态
  private mapApiStatusToLogisticsStatus(apiStatus: string): LogisticsStatus {
    const statusMap: Record<string, LogisticsStatus> = {
      'pending': LogisticsStatus.PENDING,
      'picked_up': LogisticsStatus.PICKED_UP,
      'in_transit': LogisticsStatus.IN_TRANSIT,
      'out_for_delivery': LogisticsStatus.OUT_FOR_DELIVERY,
      'delivered': LogisticsStatus.DELIVERED,
      'exception': LogisticsStatus.EXCEPTION,
      'rejected': LogisticsStatus.REJECTED,
      'returned': LogisticsStatus.RETURNED
    };

    return statusMap[apiStatus] || LogisticsStatus.PENDING;
  }
}