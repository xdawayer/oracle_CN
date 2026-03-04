// Report Service - handles paid report generation and storage
import { v4 as uuidv4 } from 'uuid';
import { isDatabaseConfigured, BirthProfile, query, getOne, insert, remove } from '../db/mysql.js';
import { PRODUCTS } from '../config/stripe.js';
import { generateAIContent } from './ai.js';

export type ReportType = 'monthly' | 'annual' | 'career' | 'wealth' | 'love' | 'saturn_return' | 'synastry_deep';

export interface ReportContent {
  title: string;
  subtitle?: string;
  generatedAt: string;
  sections: ReportSection[];
  summary?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  highlights?: string[];
  advice?: string[];
  rating?: number; // 1-10 scale for applicable sections
}

export interface DbReport {
  id: string;
  user_id: string;
  report_type: ReportType;
  title: string;
  content: ReportContent;
  pdf_url?: string;
  birth_profile: BirthProfile;
  partner_profile?: BirthProfile;
  generated_at: string;
  created_at: string;
}

// Report templates for AI generation
const REPORT_PROMPTS: Record<ReportType, { systemPrompt: string; sections: string[] }> = {
  monthly: {
    systemPrompt: `You are an expert astrologer creating a comprehensive monthly forecast report.
    Provide detailed, actionable insights based on transits affecting the natal chart.
    Focus on practical guidance while maintaining astrological depth.`,
    sections: [
      'monthly_overview',
      'key_transits',
      'career_money',
      'relationships',
      'health_wellness',
      'personal_growth',
      'lucky_dates',
      'monthly_advice',
    ],
  },
  annual: {
    systemPrompt: `You are an expert astrologer creating a comprehensive annual forecast report.
    Cover major themes, opportunities, and challenges for the year ahead.
    Include quarterly breakdowns and significant planetary influences.`,
    sections: [
      'year_overview',
      'major_themes',
      'q1_forecast',
      'q2_forecast',
      'q3_forecast',
      'q4_forecast',
      'career_trajectory',
      'relationship_evolution',
      'financial_outlook',
      'personal_development',
      'key_dates',
      'annual_advice',
    ],
  },
  career: {
    systemPrompt: `You are an expert astrologer specializing in career and vocational astrology.
    Analyze the natal chart for career aptitudes, professional strengths, and timing for career moves.
    Provide actionable career guidance based on planetary placements.`,
    sections: [
      'career_overview',
      'natural_talents',
      'ideal_professions',
      'work_style',
      'leadership_potential',
      'current_opportunities',
      'challenges_to_overcome',
      'best_timing',
      'career_advice',
    ],
  },
  wealth: {
    systemPrompt: `You are an expert astrologer specializing in financial astrology.
    Analyze wealth potential, money mindset, and financial timing based on the natal chart.
    Provide practical financial guidance within an astrological framework.`,
    sections: [
      'wealth_overview',
      'money_mindset',
      'earning_potential',
      'investment_style',
      'financial_strengths',
      'financial_challenges',
      'prosperity_timing',
      'wealth_advice',
    ],
  },
  love: {
    systemPrompt: `You are an expert astrologer specializing in relationship and love astrology.
    Analyze romantic patterns, ideal partner qualities, and relationship timing.
    Provide compassionate guidance for love and partnership.`,
    sections: [
      'love_overview',
      'relationship_style',
      'ideal_partner',
      'attraction_patterns',
      'love_strengths',
      'relationship_challenges',
      'love_timing',
      'relationship_advice',
    ],
  },
  saturn_return: {
    systemPrompt: `You are an expert astrologer specializing in Saturn Return interpretations.
    This is a pivotal life transition. Provide deep insights into the lessons and growth opportunities.
    Address both challenges and the profound transformation available during this period.`,
    sections: [
      'saturn_return_overview',
      'your_saturn_placement',
      'major_life_themes',
      'career_restructuring',
      'relationship_maturation',
      'identity_evolution',
      'timeline_phases',
      'survival_guide',
      'transformation_potential',
    ],
  },
  synastry_deep: {
    systemPrompt: `You are an expert astrologer specializing in synastry and relationship compatibility.
    Analyze the deep connection between two natal charts, exploring both the beautiful harmonies
    and the challenging aspects. Provide practical guidance for navigating the relationship.`,
    sections: [
      'synastry_overview',
      'emotional_connection',
      'communication_styles',
      'love_languages',
      'passion_attraction',
      'long_term_potential',
      'growth_challenges',
      'karmic_connections',
      'composite_themes',
      'relationship_advice',
    ],
  },
};

class ReportService {
  // Check if user has purchased a specific report type (bound to birth info via chartHash)
  async hasReportAccess(userId: string, reportType: ReportType, chartHash?: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;

    if (chartHash) {
      // 精确检查：userId + reportType + chartHash（出生信息绑定）
      const record = await getOne<{ id: string }>(
        'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND feature_id = ?',
        [userId, 'report', `${reportType}:${chartHash}`]
      );
      if (record) return true;

      // 检查 reports 表（含 chartHash）
      const existingReport = await getOne<{ id: string }>(
        'SELECT id FROM reports WHERE user_id = ? AND report_type = ? AND JSON_UNQUOTE(JSON_EXTRACT(content, \'$.chartHash\')) = ?',
        [userId, reportType, chartHash]
      );
      if (existingReport) return true;

      return false;
    }

    // 无 chartHash 时的宽松检查（兼容旧路由）
    const record = await getOne<{ id: string }>(
      'SELECT id FROM purchase_records WHERE user_id = ? AND feature_type = ? AND feature_id = ?',
      [userId, 'report', reportType]
    );
    if (record) return true;

    const existingReport = await getOne<{ id: string }>(
      'SELECT id FROM reports WHERE user_id = ? AND report_type = ?',
      [userId, reportType]
    );
    if (existingReport) return true;

    const purchase = await getOne<{ id: string }>(
      'SELECT id FROM purchases WHERE user_id = ? AND product_type = ? AND product_id = ? AND status = ?',
      [userId, 'report', reportType, 'completed']
    );

    return !!purchase;
  }

  // Get user's purchased reports (deduplicated by report_type, keeping latest)
  async getUserReports(userId: string): Promise<DbReport[]> {
    if (!isDatabaseConfigured()) return [];

    const data = await query<DbReport>(
      'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // 按 report_type 去重，保留最新的一份
    const seen = new Set<string>();
    const deduped: DbReport[] = [];
    for (const row of data) {
      if (!seen.has(row.report_type)) {
        seen.add(row.report_type);
        deduped.push(row);
      }
    }
    return deduped;
  }

  // Get report count for a user (deduplicated by report_type)
  async getReportCount(userId: string): Promise<number> {
    if (!isDatabaseConfigured()) return 0;

    const data = await query<{ report_type: string }>(
      'SELECT report_type FROM reports WHERE user_id = ?',
      [userId]
    );

    const uniqueTypes = new Set(data.map(r => r.report_type));
    return uniqueTypes.size;
  }

  // Get a specific report
  async getReport(userId: string, reportId: string): Promise<DbReport | null> {
    if (!isDatabaseConfigured()) return null;

    return getOne<DbReport>(
      'SELECT * FROM reports WHERE id = ? AND user_id = ?',
      [reportId, userId]
    );
  }

  // Get report by type (most recent)
  async getReportByType(userId: string, reportType: ReportType): Promise<DbReport | null> {
    if (!isDatabaseConfigured()) return null;

    return getOne<DbReport>(
      'SELECT * FROM reports WHERE user_id = ? AND report_type = ? ORDER BY created_at DESC LIMIT 1',
      [userId, reportType]
    );
  }

  // Generate a new report
  async generateReport(
    userId: string,
    reportType: ReportType,
    birthProfile: BirthProfile,
    language: 'en' | 'zh' = 'en',
    partnerProfile?: BirthProfile
  ): Promise<DbReport> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const template = REPORT_PROMPTS[reportType];
    if (!template) {
      throw new Error(`Invalid report type: ${reportType}`);
    }

    // Generate report content via AI
    const content = await this.generateReportContent(
      reportType,
      template,
      birthProfile,
      language,
      partnerProfile
    );

    // Store the report
    const reportData = {
      id: uuidv4(),
      user_id: userId,
      report_type: reportType,
      title: content.title,
      content,
      birth_profile: birthProfile,
      partner_profile: partnerProfile || null,
      generated_at: new Date().toISOString(),
    };

    const report = await insert<DbReport>('reports', reportData);
    return report;
  }

  // Generate report content using AI
  private async generateReportContent(
    reportType: ReportType,
    template: { systemPrompt: string; sections: string[] },
    birthProfile: BirthProfile,
    language: 'en' | 'zh',
    partnerProfile?: BirthProfile
  ): Promise<ReportContent> {
    const reportTitles: Record<ReportType, { en: string; zh: string }> = {
      monthly: { en: 'Monthly Forecast Report', zh: '月度运势报告' },
      annual: { en: 'Annual Forecast Report', zh: '年度运势报告' },
      career: { en: 'Career & Profession Report', zh: '事业职业报告' },
      wealth: { en: 'Wealth & Finance Report', zh: '财富理财报告' },
      love: { en: 'Love & Relationship Report', zh: '爱情关系报告' },
      saturn_return: { en: 'Saturn Return Report', zh: '土星回归报告' },
      synastry_deep: { en: 'Synastry Deep Report', zh: '合盘深度报告' },
    };

    const sections: ReportSection[] = [];

    // Generate each section
    for (const sectionId of template.sections) {
      try {
        const result = await generateAIContent<{
          title?: string;
          content?: string;
          highlights?: string[];
          advice?: string[];
          rating?: number;
        }>({
          promptId: 'report-section',
          context: {
            reportType,
            sectionId,
            birthProfile,
            partnerProfile,
            systemPrompt: template.systemPrompt,
          },
          lang: language,
          allowMock: true,
          timeoutMs: 60000,
        });

        const sectionContent = result.content;

        sections.push({
          id: sectionId,
          title: sectionContent.title || this.formatSectionTitle(sectionId),
          content: sectionContent.content || '',
          highlights: sectionContent.highlights,
          advice: sectionContent.advice,
          rating: sectionContent.rating,
        });
      } catch (error) {
        console.error(`Failed to generate section ${sectionId}:`, error);
        // Add placeholder section on error
        sections.push({
          id: sectionId,
          title: this.formatSectionTitle(sectionId),
          content: 'This section is being processed. Please check back shortly.',
        });
      }
    }

    return {
      title: reportTitles[reportType][language],
      generatedAt: new Date().toISOString(),
      sections,
    };
  }

  // Helper to format section titles
  private formatSectionTitle(sectionId: string): string {
    return sectionId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getReportPrice(reportType: ReportType): number {
    const product = PRODUCTS.reports[reportType];
    if (!product) return 0;
    return Math.ceil((product.amount || 0) / 10);
  }

  // Get available report types with pricing
  getAvailableReports(): Array<{
    type: ReportType;
    name: string;
    description: string;
    price: number;
  }> {
    return [
      {
        type: 'monthly',
        name: 'Monthly Forecast',
        description: 'Detailed month-ahead predictions with key dates and guidance',
        price: this.getReportPrice('monthly'),
      },
      {
        type: 'annual',
        name: 'Annual Forecast',
        description: 'Comprehensive year overview with quarterly breakdowns',
        price: this.getReportPrice('annual'),
      },
      {
        type: 'career',
        name: 'Career & Profession',
        description: 'Deep dive into career potential and professional guidance',
        price: this.getReportPrice('career'),
      },
      {
        type: 'wealth',
        name: 'Wealth & Finance',
        description: 'Financial astrology insights and prosperity timing',
        price: this.getReportPrice('wealth'),
      },
      {
        type: 'love',
        name: 'Love & Relationships',
        description: 'Romantic patterns, ideal partner, and love timing',
        price: this.getReportPrice('love'),
      },
      {
        type: 'saturn_return',
        name: 'Saturn Return',
        description: 'Navigate this pivotal life transition with clarity',
        price: this.getReportPrice('saturn_return'),
      },
      {
        type: 'synastry_deep',
        name: 'Synastry Deep Report',
        description: 'Comprehensive compatibility analysis for two charts',
        price: this.getReportPrice('synastry_deep'),
      },
    ];
  }

  // Delete a report
  async deleteReport(userId: string, reportId: string): Promise<boolean> {
    if (!isDatabaseConfigured()) return false;

    const affected = await remove('reports', 'id = ? AND user_id = ?', [reportId, userId]);
    return affected > 0;
  }
}

export const reportService = new ReportService();
export default reportService;
