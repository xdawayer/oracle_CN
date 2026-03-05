// Reports API routes
import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from './auth.js';
import reportService, { ReportType } from '../services/reportService.js';
import { REPORT_PRICES } from './report.js';
import { computeChartHash } from '../services/report-task.js';
import type { BirthInput } from '../types/api.js';
import { isDatabaseConfigured, getOne } from '../db/mysql.js';

const router = Router();

// Get available report types with pricing
router.get('/available', async (_req: Request, res: Response) => {
  const reports = reportService.getAvailableReports();
  res.json({ reports });
});

// Get user's purchased reports
router.get('/', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    let birthFilter: { date: string; time: string; city: string } | undefined;
    if (isDatabaseConfigured()) {
      const user = await getOne<{ birth_profile: Record<string, string> | null }>(
        'SELECT birth_profile FROM users WHERE id = ?',
        [req.userId!]
      );
      const bp = (user?.birth_profile as Record<string, string>) || {};
      if (bp.date) {
        birthFilter = { date: bp.date, time: bp.time || '', city: bp.city || bp.location || '' };
      }
    }

    const reports = await reportService.getUserReports(req.userId!, birthFilter);

    res.json({
      reports: reports.map(r => ({
        id: r.id,
        type: r.report_type,
        title: r.title,
        generatedAt: r.generated_at,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Get a specific report
router.get('/:reportId', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = await reportService.getReport(req.userId!, reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      id: report.id,
      type: report.report_type,
      title: report.title,
      content: report.content,
      pdfUrl: report.pdf_url,
      birthProfile: report.birth_profile,
      partnerProfile: report.partner_profile,
      generatedAt: report.generated_at,
      createdAt: report.created_at,
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

// Check if user has access to a report type (supports birth-info-bound check via ?birth=JSON)
router.get('/access/:reportType', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const reportType = req.params.reportType as ReportType;
    const validTypes = ['monthly', 'annual', 'career', 'wealth', 'love', 'saturn_return', 'synastry_deep', 'natal-report', 'love-topic', 'career-topic', 'wealth-topic'];

    if (!validTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // 如果前端传了 birth 参数，则做精确的出生信息绑定检查
    let chartHash: string | undefined;
    const birthParam = req.query.birth as string | undefined;
    if (birthParam) {
      try {
        const birthData = JSON.parse(birthParam) as Partial<BirthInput>;
        chartHash = await computeChartHash(birthData);
      } catch {
        // birth 参数解析失败，降级到无 chartHash 检查
      }
    }

    const hasAccess = await reportService.hasReportAccess(req.userId!, reportType, chartHash);
    const existingReport = await reportService.getReportByType(req.userId!, reportType);
    // 优先使用中国市场定价，回退到 Stripe 定价
    const price = REPORT_PRICES[reportType] || reportService.getReportPrice(reportType);
    if (!price) {
      return res.status(400).json({ error: 'Report pricing unavailable' });
    }

    res.json({
      hasAccess,
      existingReport: existingReport ? {
        id: existingReport.id,
        generatedAt: existingReport.generated_at,
      } : null,
      price,
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

// [DEPRECATED] Generate a report — 请使用 POST /api/report/create（统一异步任务 + 积分门控）
router.post('/generate', authMiddleware, requireAuth, async (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Deprecated. Use POST /api/report/create instead.' });
});

// [DEPRECATED] Purchase a report — 请使用 POST /api/report/create（内置积分门控）
router.post('/purchase', authMiddleware, requireAuth, async (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Deprecated. Use POST /api/report/create instead.' });
});


// Delete a report
router.delete('/:reportId', authMiddleware, requireAuth, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const deleted = await reportService.deleteReport(req.userId!, reportId);

    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
