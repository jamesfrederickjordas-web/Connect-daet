'use client';

import type { MonthlyBucket, SatisfactionSummary } from '@/lib/analytics';

export function MonthlyArrivalsChart({
  buckets,
}: {
  buckets: MonthlyBucket[];
}) {
  const recent = buckets.slice(-6);
  const maxVal = Math.max(1, ...recent.map((b) => b.total));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Monthly Tourist Arrivals (Local vs. Foreign)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated non-archived arrival records across Daet destinations.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            Local
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
            Foreign
          </span>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-slate-500 py-10 text-center">
          No arrival records available yet.
        </p>
      ) : (
        <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
          {recent.map((b) => {
            const localPct = (b.local / maxVal) * 100;
            const foreignPct = (b.foreign / maxVal) * 100;
            return (
              <div
                key={b.month}
                className="flex flex-col items-center h-full justify-end gap-1.5"
              >
                <span className="text-[11px] font-medium text-slate-700">
                  {b.total.toLocaleString()}
                </span>
                <div className="w-full max-w-[44px] flex flex-col justify-end h-32 bg-slate-100 rounded-t-md overflow-hidden">
                  <div
                    className="w-full bg-cyan-400 transition-all"
                    style={{ height: `${foreignPct}%` }}
                    title={`Foreign: ${b.foreign.toLocaleString()}`}
                  />
                  <div
                    className="w-full bg-blue-600 transition-all"
                    style={{ height: `${localPct}%` }}
                    title={`Local: ${b.local.toLocaleString()}`}
                  />
                </div>
                <span className="text-[11px] text-slate-500 truncate w-full text-center">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Chart Explanation:</span>{' '}
        Shows monthly visitor volume split by origin. Domestic travelers form the
        core of Daet arrivals, while foreign shares indicate international surf
        and heritage reach.
      </p>
    </div>
  );
}

export function RevenueTrendChart({
  buckets,
}: {
  buckets: MonthlyBucket[];
}) {
  const recent = buckets.slice(-6);
  const maxRev = Math.max(1, ...recent.map((b) => b.revenuePhp));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          Monthly Tourism Revenue Trend (PHP)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Combined verified and estimated economic records by month.
        </p>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-slate-500 py-10 text-center">
          No economic records available yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {recent.map((b) => {
            const pct = Math.max(4, (b.revenuePhp / maxRev) * 100);
            return (
              <div key={b.month} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{b.label}</span>
                  <span className="text-slate-600">
                    ₱{b.revenuePhp.toLocaleString('en-PH')}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Chart Explanation:</span>{' '}
        Tracks monthly tourism receipts across accommodation, food, tours,
        transport, and retail. Spikes typically align with peak surf and
        festival months.
      </p>
    </div>
  );
}

export function DestinationBreakdownCard({
  destinations,
}: {
  destinations: { destination: string; total: number }[];
}) {
  const maxTotal = Math.max(1, ...destinations.map((d) => d.total));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">
        Destination Breakdown
      </h3>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">
        Cumulative recorded arrivals per Daet destination.
      </p>

      <div className="space-y-3">
        {destinations.map((d) => {
          const pct = Math.max(4, (d.total / maxTotal) * 100);
          return (
            <div key={d.destination} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-800">
                  {d.destination}
                </span>
                <span className="text-slate-600">
                  {d.total.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SatisfactionCard({
  summary,
}: {
  summary: SatisfactionSummary;
}) {
  const badgeColor =
    summary.sentimentLabel === 'Positive'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : summary.sentimentLabel === 'Neutral'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Tourist Satisfaction (Subsystem 9)
          </h3>
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${badgeColor}`}
          >
            {summary.sentimentLabel}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Mean of valid 1–5 ratings ingested from Emoji Sentiment Analysis.
        </p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-900">
            {summary.totalRatings > 0 ? summary.averageScore.toFixed(2) : '—'}
          </span>
          <span className="text-sm text-slate-500">/ 5.00</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Based on {summary.totalRatings} ingested rating(s)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
        <div className="rounded-lg bg-emerald-50 p-2">
          <div className="text-sm font-semibold text-emerald-700">
            {summary.positiveCount}
          </div>
          <div className="text-[11px] text-emerald-600">Positive (4–5)</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <div className="text-sm font-semibold text-amber-700">
            {summary.neutralCount}
          </div>
          <div className="text-[11px] text-amber-600">Neutral (3–3.9)</div>
        </div>
        <div className="rounded-lg bg-rose-50 p-2">
          <div className="text-sm font-semibold text-rose-700">
            {summary.negativeCount}
          </div>
          <div className="text-[11px] text-rose-600">Negative (&lt;3)</div>
        </div>
      </div>
    </div>
  );
}
