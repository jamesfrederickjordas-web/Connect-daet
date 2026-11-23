import type {
  ArrivalRecord,
  EconomicRecord,
  RuleInsight,
  SatisfactionRating,
  SustainabilityIndicator,
} from './types';

export const DAET_DESTINATIONS = [
  'Bagasbas Beach',
  'Rizal Monument Area',
  'Daet Public Market',
  'Mercedes Fish Port',
  'Museo Bulawan',
  'Saint John the Baptist Church',
  'Provincial Capitol',
  'Calaguas Gateway',
] as const;

export interface MonthlyBucket {
  month: string; // YYYY-MM
  label: string;
  local: number;
  foreign: number;
  total: number;
  revenuePhp: number;
}

export interface ForecastResult {
  nextMonthLabel: string;
  estimatedArrivals: number;
  basisMonths: { label: string; total: number }[];
  formulaLabel: string;
}

export interface SatisfactionSummary {
  averageScore: number;
  totalRatings: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  sentimentLabel: 'Positive' | 'Neutral' | 'Needs Attention' | 'No Data';
}

/**
 * Chapter 3 formula: Growth rate = ((A_recent - A_prior) / A_prior) * 100
 * Compares arrivals of the last 30 days with arrivals of the 30 days before.
 */
export function computeGrowthRate(
  arrivals: ArrivalRecord[],
  referenceDate = new Date()
): {
  recentArrivals: number;
  priorArrivals: number;
  growthRatePct: number | null;
} {
  const refMs = referenceDate.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const recentStart = refMs - 30 * dayMs;
  const priorStart = refMs - 60 * dayMs;

  let recentArrivals = 0;
  let priorArrivals = 0;

  for (const row of arrivals) {
    if (row.is_archived) continue;
    const t = new Date(row.reporting_date + 'T00:00:00Z').getTime();
    const total = row.local_count + row.foreign_count;
    if (t >= recentStart && t <= refMs) {
      recentArrivals += total;
    } else if (t >= priorStart && t < recentStart) {
      priorArrivals += total;
    }
  }

  const growthRatePct =
    priorArrivals > 0
      ? Number((((recentArrivals - priorArrivals) / priorArrivals) * 100).toFixed(1))
      : null;

  return { recentArrivals, priorArrivals, growthRatePct };
}

export function buildMonthlyBuckets(
  arrivals: ArrivalRecord[],
  economics: EconomicRecord[]
): MonthlyBucket[] {
  const map = new Map<string, MonthlyBucket>();

  const ensure = (ym: string) => {
    let bucket = map.get(ym);
    if (!bucket) {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      bucket = { month: ym, label, local: 0, foreign: 0, total: 0, revenuePhp: 0 };
      map.set(ym, bucket);
    }
    return bucket;
  };

  for (const row of arrivals) {
    if (row.is_archived) continue;
    const ym = row.reporting_date.slice(0, 7);
    const b = ensure(ym);
    b.local += row.local_count;
    b.foreign += row.foreign_count;
    b.total += row.local_count + row.foreign_count;
  }

  for (const row of economics) {
    if (row.is_archived) continue;
    const ym = row.reporting_date.slice(0, 7);
    const b = ensure(ym);
    b.revenuePhp += Number(row.estimated_revenue_php || 0);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Chapter 3 formula: A_next = 1.05 * ((A_{m-2} + A_{m-1} + A_m) / 3)
 * Takes the mean of the last three months with data and applies a fixed factor of 1.05.
 */
export function computeThreeMonthRollingForecast(
  monthlyBuckets: MonthlyBucket[]
): ForecastResult | null {
  const withData = monthlyBuckets.filter((m) => m.total > 0);
  if (withData.length === 0) return null;

  const lastThree = withData.slice(-3);
  const sum = lastThree.reduce((acc, m) => acc + m.total, 0);
  const estimatedArrivals = Math.round(1.05 * (sum / lastThree.length));

  const lastMonth = lastThree[lastThree.length - 1].month;
  const [y, m] = lastMonth.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m, 1));
  const nextMonthLabel = nextDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    nextMonthLabel,
    estimatedArrivals,
    basisMonths: lastThree.map((b) => ({ label: b.label, total: b.total })),
    formulaLabel: `1.05 × mean(${lastThree.map((b) => b.total.toLocaleString()).join(', ')})`,
  };
}

/**
 * Chapter 3 formula: Satisfaction score is the mean of valid ratings 1..5 from Subsystem 9.
 * >= 4: Positive, 3 to <4: Neutral, <3: Negative
 */
export function computeSatisfactionSummary(
  ratings: SatisfactionRating[]
): SatisfactionSummary {
  const valid = ratings.filter((r) => r.rating >= 1 && r.rating <= 5);
  if (valid.length === 0) {
    return {
      averageScore: 0,
      totalRatings: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      sentimentLabel: 'No Data',
    };
  }

  let sum = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;

  for (const r of valid) {
    const val = Number(r.rating);
    sum += val;
    if (val >= 4) positiveCount++;
    else if (val >= 3) neutralCount++;
    else negativeCount++;
  }

  const averageScore = Number((sum / valid.length).toFixed(2));
  const sentimentLabel =
    averageScore >= 4
      ? 'Positive'
      : averageScore >= 3
        ? 'Neutral'
        : 'Needs Attention';

  return {
    averageScore,
    totalRatings: valid.length,
    positiveCount,
    neutralCount,
    negativeCount,
    sentimentLabel,
  };
}

export function generateRuleBasedInsights(params: {
  arrivals: ArrivalRecord[];
  economics: EconomicRecord[];
  indicators: SustainabilityIndicator[];
  satisfaction: SatisfactionSummary;
  growthRatePct: number | null;
}): RuleInsight[] {
  const insights: RuleInsight[] = [];
  const activeArrivals = params.arrivals.filter((a) => !a.is_archived);
  const activeEconomics = params.economics.filter((e) => !e.is_archived);
  const activeIndicators = params.indicators.filter((i) => !i.is_archived);

  if (params.growthRatePct !== null) {
    if (params.growthRatePct >= 10) {
      insights.push({
        id: 'arrival-surge',
        severity: 'positive',
        title: 'Strong 30-Day Arrival Growth',
        message: `Tourist arrivals grew by +${params.growthRatePct}% over the last 30 days compared to the prior 30-day window.`,
        recommendation:
          'Coordinate with Barangay Bagasbas and destination staff to monitor carrying capacity and waste diversion during peak weekends.',
      });
    } else if (params.growthRatePct <= -10) {
      insights.push({
        id: 'arrival-dip',
        severity: 'warning',
        title: 'Notable 30-Day Arrival Decline',
        message: `Tourist arrivals decreased by ${params.growthRatePct}% compared to the prior 30 days.`,
        recommendation:
          'Review seasonal weather advisories and coordinate promotional events with Subsystem 5 (Programs & Events).',
      });
    } else {
      insights.push({
        id: 'arrival-steady',
        severity: 'info',
        title: 'Steady Arrival Volume',
        message: `30-day arrivals changed by ${params.growthRatePct >= 0 ? '+' : ''}${params.growthRatePct}%, staying within normal seasonal variance.`,
        recommendation: 'Continue routine weekly logging across all accredited establishments.',
      });
    }
  }

  const totalLocal = activeArrivals.reduce((s, r) => s + r.local_count, 0);
  const totalForeign = activeArrivals.reduce((s, r) => s + r.foreign_count, 0);
  const totalVisitors = totalLocal + totalForeign;
  if (totalVisitors > 0) {
    const foreignShare = (totalForeign / totalVisitors) * 100;
    if (foreignShare < 10) {
      insights.push({
        id: 'foreign-share',
        severity: 'info',
        title: 'Domestic-Driven Tourism Mix',
        message: `Foreign visitors represent ${foreignShare.toFixed(1)}% of recorded arrivals (${totalForeign.toLocaleString()} of ${totalVisitors.toLocaleString()}).`,
        recommendation:
          'Target international surf and heritage packages to diversify visitor spending beyond domestic weekend trips.',
      });
    }
  }

  const verifiedRev = activeEconomics
    .filter((e) => e.verification_status === 'verified')
    .reduce((s, e) => s + Number(e.estimated_revenue_php), 0);
  const totalRev = activeEconomics.reduce(
    (s, e) => s + Number(e.estimated_revenue_php),
    0
  );
  if (totalRev > 0) {
    const verifiedPct = (verifiedRev / totalRev) * 100;
    if (verifiedPct < 70) {
      insights.push({
        id: 'verified-ratio',
        severity: 'warning',
        title: 'High Share of Estimated Revenue',
        message: `Only ${verifiedPct.toFixed(1)}% of recorded tourism revenue is marked Verified.`,
        recommendation:
          'Follow up with transport and retail establishments for official receipts or monthly LGU filings.',
      });
    } else {
      insights.push({
        id: 'verified-strong',
        severity: 'positive',
        title: 'Strong Economic Verification Rate',
        message: `${verifiedPct.toFixed(1)}% of recorded tourism revenue (₱${verifiedRev.toLocaleString()}) is backed by verified records.`,
        recommendation: 'Maintain quarterly verification audits with accredited accommodation partners.',
      });
    }
  }

  const watchOrCritical = activeIndicators.filter(
    (i) => i.status === 'watch' || i.status === 'critical'
  );
  if (watchOrCritical.length > 0) {
    insights.push({
      id: 'sustainability-watch',
      severity: 'warning',
      title: `${watchOrCritical.length} Sustainability Indicator(s) Need Attention`,
      message: `Indicators flagged: ${watchOrCritical.map((i) => i.indicator_name).join(', ')}.`,
      recommendation:
        'Prioritize municipal action on coastal waste diversion, carrying capacity, and establishment reporting compliance.',
    });
  }

  if (params.satisfaction.totalRatings > 0) {
    insights.push({
      id: 'sentiment-check',
      severity: params.satisfaction.averageScore >= 4 ? 'positive' : 'warning',
      title: `Visitor Satisfaction: ${params.satisfaction.averageScore}/5 (${params.satisfaction.sentimentLabel})`,
      message: `Based on ${params.satisfaction.totalRatings} ratings ingested from Subsystem 9 (Emoji Sentiment Analysis).`,
      recommendation:
        params.satisfaction.averageScore >= 4
          ? 'Share positive destination feedback with local hospitality partners.'
          : 'Inspect destinations scoring below 3.5 for service or facility issues.',
    });
  }

  return insights;
}

export function buildTextReport(params: {
  reportType: string;
  periodStart: string;
  periodEnd: string;
  arrivals: ArrivalRecord[];
  economics: EconomicRecord[];
  indicators: SustainabilityIndicator[];
  satisfaction: SatisfactionSummary;
  forecast: ForecastResult | null;
}): string {
  const inRangeArrivals = params.arrivals.filter(
    (a) =>
      !a.is_archived &&
      a.reporting_date >= params.periodStart &&
      a.reporting_date <= params.periodEnd
  );
  const inRangeEconomics = params.economics.filter(
    (e) =>
      !e.is_archived &&
      e.reporting_date >= params.periodStart &&
      e.reporting_date <= params.periodEnd
  );

  const localTotal = inRangeArrivals.reduce((s, r) => s + r.local_count, 0);
  const foreignTotal = inRangeArrivals.reduce((s, r) => s + r.foreign_count, 0);
  const grandTotal = localTotal + foreignTotal;

  const verifiedRev = inRangeEconomics
    .filter((e) => e.verification_status === 'verified')
    .reduce((s, e) => s + Number(e.estimated_revenue_php), 0);
  const estimatedRev = inRangeEconomics
    .filter((e) => e.verification_status === 'estimated')
    .reduce((s, e) => s + Number(e.estimated_revenue_php), 0);
  const totalEmp = inRangeEconomics.reduce((s, e) => s + e.employment_count, 0);

  const destMap = new Map<string, number>();
  for (const r of inRangeArrivals) {
    destMap.set(r.destination, (destMap.get(r.destination) || 0) + r.local_count + r.foreign_count);
  }
  const destLines = Array.from(destMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([d, count]) => `  - ${d}: ${count.toLocaleString()} arrivals`)
    .join('\n');

  const indLines = params.indicators
    .filter((i) => !i.is_archived)
    .map(
      (i) =>
        `  - [${i.category.toUpperCase()}] ${i.indicator_name}: ${i.metric_value} ${i.unit} (Status: ${i.status.toUpperCase()})`
    )
    .join('\n');

  return [
    '====================================================================',
    'MUNICIPAL TOURISM OFFICE OF DAET, CAMARINES NORTE',
    'TOURISM IMPACT ASSESSMENT AND DATA ANALYTICS SYSTEM (TIA-DAS)',
    'CONNECT-DAET.ph — Subsystem 10',
    '====================================================================',
    `Report Type   : ${params.reportType}`,
    `Period        : ${params.periodStart} to ${params.periodEnd}`,
    `Generated At  : ${new Date().toISOString()}`,
    'Privacy Note  : Aggregated metrics only (RA 10173 compliant; no tourist PII)',
    '',
    '1. TOURIST ARRIVALS SUMMARY',
    `  Total Arrivals  : ${grandTotal.toLocaleString()}`,
    `  Local Visitors  : ${localTotal.toLocaleString()}`,
    `  Foreign Visitors: ${foreignTotal.toLocaleString()}`,
    '',
    '  Destination Breakdown:',
    destLines || '  - No arrival records in selected period.',
    '',
    '2. ECONOMIC IMPACT SUMMARY',
    `  Total Revenue   : PHP ${(verifiedRev + estimatedRev).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `  Verified Revenue: PHP ${verifiedRev.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `  Estimated Rev.  : PHP ${estimatedRev.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `  Reported Jobs   : ${totalEmp.toLocaleString()} employment records`,
    '',
    '3. SUSTAINABILITY INDICATORS (SF-MST 4 DIMENSIONS)',
    indLines || '  - No active indicators.',
    '',
    '4. VISITOR SATISFACTION & TREND-BASED FORECAST',
    `  Satisfaction Score : ${params.satisfaction.averageScore}/5 (${params.satisfaction.sentimentLabel}, n=${params.satisfaction.totalRatings})`,
    params.forecast
      ? `  3-Month Rolling Forecast (${params.forecast.nextMonthLabel}): ~${params.forecast.estimatedArrivals.toLocaleString()} arrivals (Trend-Based Estimate; ${params.forecast.formulaLabel})`
      : '  3-Month Rolling Forecast: Insufficient monthly data.',
    '====================================================================',
  ].join('\n');
}
