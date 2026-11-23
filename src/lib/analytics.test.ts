import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyBuckets,
  buildTextReport,
  computeGrowthRate,
  computeSatisfactionSummary,
  computeThreeMonthRollingForecast,
} from './analytics.ts';
import type { ArrivalRecord, EconomicRecord, SatisfactionRating } from './types.ts';

test('computeGrowthRate compares last 30 days vs prior 30 days', () => {
  const ref = new Date('2026-11-24T00:00:00Z');
  const arrivals: ArrivalRecord[] = [
    {
      id: '1',
      reporting_date: '2026-11-10',
      destination: 'Bagasbas Beach',
      visitor_type: 'overnight',
      local_count: 110,
      foreign_count: 10,
      data_source_id: null,
      notes: null,
      is_archived: false,
      archived_at: null,
      created_at: '',
    },
    {
      id: '2',
      reporting_date: '2026-10-10',
      destination: 'Bagasbas Beach',
      visitor_type: 'overnight',
      local_count: 90,
      foreign_count: 10,
      data_source_id: null,
      notes: null,
      is_archived: false,
      archived_at: null,
      created_at: '',
    },
  ];
  const res = computeGrowthRate(arrivals, ref);
  assert.equal(res.recentArrivals, 120);
  assert.equal(res.priorArrivals, 100);
  assert.equal(res.growthRatePct, 20);
});

test('computeThreeMonthRollingForecast applies 1.05x to mean of last 3 months', () => {
  const arrivals: ArrivalRecord[] = [
    {
      id: '1',
      reporting_date: '2026-08-15',
      destination: 'Bagasbas Beach',
      visitor_type: 'day_visitor',
      local_count: 100,
      foreign_count: 0,
      data_source_id: null,
      notes: null,
      is_archived: false,
      archived_at: null,
      created_at: '',
    },
    {
      id: '2',
      reporting_date: '2026-09-15',
      destination: 'Bagasbas Beach',
      visitor_type: 'day_visitor',
      local_count: 200,
      foreign_count: 0,
      data_source_id: null,
      notes: null,
      is_archived: false,
      archived_at: null,
      created_at: '',
    },
    {
      id: '3',
      reporting_date: '2026-10-15',
      destination: 'Bagasbas Beach',
      visitor_type: 'day_visitor',
      local_count: 300,
      foreign_count: 0,
      data_source_id: null,
      notes: null,
      is_archived: false,
      archived_at: null,
      created_at: '',
    },
  ];
  const buckets = buildMonthlyBuckets(arrivals, [] as EconomicRecord[]);
  const forecast = computeThreeMonthRollingForecast(buckets);
  assert.ok(forecast);
  // mean(100, 200, 300) = 200; 200 * 1.05 = 210
  assert.equal(forecast.estimatedArrivals, 210);
});

test('computeSatisfactionSummary classifies positive, neutral, and negative', () => {
  const ratings: SatisfactionRating[] = [
    { id: '1', destination: 'Bagasbas Beach', rating: 4.5, source_subsystem: 'subsystem_9', recorded_at: '' },
    { id: '2', destination: 'Bagasbas Beach', rating: 3.5, source_subsystem: 'subsystem_9', recorded_at: '' },
    { id: '3', destination: 'Bagasbas Beach', rating: 2.5, source_subsystem: 'subsystem_9', recorded_at: '' },
  ];
  const summary = computeSatisfactionSummary(ratings);
  assert.equal(summary.totalRatings, 3);
  assert.equal(summary.positiveCount, 1);
  assert.equal(summary.neutralCount, 1);
  assert.equal(summary.negativeCount, 1);
  assert.equal(summary.averageScore, 3.5);
  assert.equal(summary.sentimentLabel, 'Neutral');
});

test('buildTextReport formats municipal report text', () => {
  const txt = buildTextReport({
    reportType: 'monthly_impact',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    arrivals: [],
    economics: [],
    indicators: [],
    satisfaction: computeSatisfactionSummary([]),
    forecast: null,
  });
  assert.match(txt, /MUNICIPAL TOURISM OFFICE OF DAET/);
  assert.match(txt, /RA 10173 compliant/);
});
