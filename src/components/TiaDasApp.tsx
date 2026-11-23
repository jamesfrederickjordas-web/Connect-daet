'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  buildMonthlyBuckets,
  buildTextReport,
  computeGrowthRate,
  computeSatisfactionSummary,
  computeThreeMonthRollingForecast,
  DAET_DESTINATIONS,
  generateRuleBasedInsights,
} from '@/lib/analytics';
import type {
  AdminProfile,
  AdminRole,
  ArrivalRecord,
  AuditLog,
  DataSource,
  EconomicRecord,
  ImportLog,
  ReportHistory,
  SatisfactionRating,
  SustainabilityCategory,
  SustainabilityIndicator,
} from '@/lib/types';
import {
  DestinationBreakdownCard,
  MonthlyArrivalsChart,
  RevenueTrendChart,
  SatisfactionCard,
} from './Charts';
import { AuthGate } from './AuthGate';
import {
  Archive,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Leaf,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

type TabKey =
  | 'overview'
  | 'arrivals'
  | 'economics'
  | 'sustainability'
  | 'reports'
  | 'integration'
  | 'admin';

export function TiaDasApp() {
  const supabase = useMemo(() => createClient(), []);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loadingData, setLoadingData] = useState(false);

  // Core datasets
  const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
  const [economics, setEconomics] = useState<EconomicRecord[]>([]);
  const [indicators, setIndicators] = useState<SustainabilityIndicator[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [ratings, setRatings] = useState<SatisfactionRating[]>([]);
  const [reports, setReports] = useState<ReportHistory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);

  // UI feedback
  const [toast, setToast] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Gemini AI Brief state
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefText, setBriefText] = useState<string | null>(null);
  const [briefNotice, setBriefNotice] = useState<string | null>(null);

  // Arrival form state
  const [todayStr, setTodayStr] = useState('');
  const [arrDate, setArrDate] = useState('');
  const [arrDest, setArrDest] = useState<string>(DAET_DESTINATIONS[0]);
  const [arrType, setArrType] =
    useState<ArrivalRecord['visitor_type']>('day_visitor');
  const [arrLocal, setArrLocal] = useState('0');
  const [arrForeign, setArrForeign] = useState('0');
  const [arrSourceId, setArrSourceId] = useState('');
  const [arrNotes, setArrNotes] = useState('');

  // Economic form state
  const [econDate, setEconDate] = useState('');
  const [econDest, setEconDest] = useState<string>(DAET_DESTINATIONS[0]);
  const [econCat, setEconCat] =
    useState<EconomicRecord['revenue_category']>('accommodation');
  const [econRev, setEconRev] = useState('0');
  const [econEmp, setEconEmp] = useState('0');
  const [econVerified, setEconVerified] =
    useState<EconomicRecord['verification_status']>('verified');
  const [econNotes, setEconNotes] = useState('');

  // Sustainability form state
  const [indName, setIndName] = useState('');
  const [indCat, setIndCat] = useState<SustainabilityCategory>('environmental');
  const [indVal, setIndVal] = useState('0');
  const [indUnit, setIndUnit] = useState('%');
  const [indTarget, setIndTarget] = useState('80');
  const [indPeriod, setIndPeriod] = useState('2026-Q4');
  const [indStatus, setIndStatus] =
    useState<SustainabilityIndicator['status']>('on_track');

  // Report form state
  const [repType, setRepType] =
    useState<ReportHistory['report_type']>('monthly_impact');
  const [repStart, setRepStart] = useState('');
  const [repEnd, setRepEnd] = useState('');
  const [latestReportText, setLatestReportText] = useState<string | null>(null);

  // Ingest tester state
  const [ingSub, setIngSub] = useState('subsystem_9');
  const [ingKey, setIngKey] = useState('daet-sub9-key-2026');
  const [ingEvent, setIngEvent] = useState('satisfaction_rating');
  const [ingDest, setIngDest] = useState<string>(DAET_DESTINATIONS[0]);
  const [ingRating, setIngRating] = useState('4.5');
  const [ingResult, setIngResult] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [
        arrRes,
        econRes,
        indRes,
        srcRes,
        impRes,
        ratRes,
        repRes,
        audRes,
        admRes,
      ] = await Promise.all([
        supabase
          .from('arrival_records')
          .select('*')
          .order('reporting_date', { ascending: false }),
        supabase
          .from('economic_records')
          .select('*')
          .order('reporting_date', { ascending: false }),
        supabase
          .from('sustainability_indicators')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('data_sources').select('*').order('name'),
        supabase
          .from('import_logs')
          .select('*')
          .order('received_at', { ascending: false })
          .limit(50),
        supabase
          .from('satisfaction_ratings')
          .select('*')
          .order('recorded_at', { ascending: false }),
        supabase
          .from('report_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('admin_profiles').select('*').order('created_at'),
      ]);

      if (arrRes.data) setArrivals(arrRes.data);
      if (econRes.data) setEconomics(econRes.data);
      if (indRes.data) setIndicators(indRes.data);
      if (srcRes.data) setDataSources(srcRes.data);
      if (impRes.data) setImportLogs(impRes.data);
      if (ratRes.data) setRatings(ratRes.data);
      if (repRes.data) setReports(repRes.data);
      if (audRes.data) setAuditLogs(audRes.data);
      if (admRes.data) setAdmins(admRes.data);
    } finally {
      setLoadingData(false);
    }
  }, [supabase]);

  const checkSession = useCallback(async () => {
    setCheckingAuth(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setUserEmail(user.email || '');
      const { data: prof } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (prof) setProfile(prof);
      await loadAllData();
    } else {
      setUserId(null);
      setProfile(null);
    }
    setCheckingAuth(false);
  }, [loadAllData, supabase]);

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const ago = new Date(now.getTime() - 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    setTodayStr(today);
    setArrDate(today);
    setEconDate(today);
    setRepStart(ago);
    setRepEnd(today);
    checkSession();
  }, [checkSession]);

  const canWrite =
    profile?.role === 'super_admin' ||
    profile?.role === 'tourism_admin' ||
    profile?.role === 'data_analyst';

  // Derived Analytics
  const activeArrivals = useMemo(
    () => arrivals.filter((a) => !a.is_archived),
    [arrivals]
  );
  const activeEconomics = useMemo(
    () => economics.filter((e) => !e.is_archived),
    [economics]
  );
  const activeIndicators = useMemo(
    () => indicators.filter((i) => !i.is_archived),
    [indicators]
  );

  const totalLocal = useMemo(
    () => activeArrivals.reduce((s, r) => s + r.local_count, 0),
    [activeArrivals]
  );
  const totalForeign = useMemo(
    () => activeArrivals.reduce((s, r) => s + r.foreign_count, 0),
    [activeArrivals]
  );
  const totalArrivals = totalLocal + totalForeign;

  const totalRevenue = useMemo(
    () =>
      activeEconomics.reduce(
        (s, r) => s + Number(r.estimated_revenue_php || 0),
        0
      ),
    [activeEconomics]
  );
  const verifiedRevenue = useMemo(
    () =>
      activeEconomics
        .filter((e) => e.verification_status === 'verified')
        .reduce((s, r) => s + Number(r.estimated_revenue_php || 0), 0),
    [activeEconomics]
  );
  const totalEmployment = useMemo(
    () => activeEconomics.reduce((s, r) => s + r.employment_count, 0),
    [activeEconomics]
  );

  const growthStats = useMemo(
    () => computeGrowthRate(arrivals),
    [arrivals]
  );
  const monthlyBuckets = useMemo(
    () => buildMonthlyBuckets(arrivals, economics),
    [arrivals, economics]
  );
  const forecast = useMemo(
    () => computeThreeMonthRollingForecast(monthlyBuckets),
    [monthlyBuckets]
  );
  const satisfaction = useMemo(
    () => computeSatisfactionSummary(ratings),
    [ratings]
  );

  const destinationTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of activeArrivals) {
      map.set(
        r.destination,
        (map.get(r.destination) || 0) + r.local_count + r.foreign_count
      );
    }
    return Array.from(map.entries())
      .map(([destination, total]) => ({ destination, total }))
      .sort((a, b) => b.total - a.total);
  }, [activeArrivals]);

  const ruleInsights = useMemo(
    () =>
      generateRuleBasedInsights({
        arrivals,
        economics,
        indicators,
        satisfaction,
        growthRatePct: growthStats.growthRatePct,
      }),
    [arrivals, economics, indicators, satisfaction, growthStats.growthRatePct]
  );

  async function logAudit(
    action: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, unknown> = {}
  ) {
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      actor_email: userEmail,
      actor_role: profile?.role || 'admin',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  }

  async function handleAddArrival(e: React.FormEvent) {
    e.preventDefault();
    const localNum = Number(arrLocal);
    const foreignNum = Number(arrForeign);
    if (!arrDate || !arrDest.trim()) {
      notify('Please complete all required arrival fields.');
      return;
    }
    if (arrDate > todayStr) {
      notify('Validation error: Reporting date cannot be in the future.');
      return;
    }
    if (localNum < 0 || foreignNum < 0 || (localNum === 0 && foreignNum === 0)) {
      notify('Validation error: Counts cannot be negative and total must exceed 0.');
      return;
    }

    const { data, error } = await supabase
      .from('arrival_records')
      .insert({
        reporting_date: arrDate,
        destination: arrDest,
        visitor_type: arrType,
        local_count: localNum,
        foreign_count: foreignNum,
        data_source_id: arrSourceId || null,
        notes: arrNotes.trim() || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      notify(`Error: ${error.message}`);
      return;
    }
    await logAudit('CREATE', 'arrival_record', data.id, {
      destination: arrDest,
      local: localNum,
      foreign: foreignNum,
    });
    setArrLocal('0');
    setArrForeign('0');
    setArrNotes('');
    notify('Arrival record saved.');
    await loadAllData();
  }

  async function handleAddEconomic(e: React.FormEvent) {
    e.preventDefault();
    const revNum = Number(econRev);
    const empNum = Number(econEmp);
    if (!econDate || !econDest.trim()) {
      notify('Please fill in required economic fields.');
      return;
    }
    if (econDate > todayStr) {
      notify('Validation error: Reporting date cannot be in the future.');
      return;
    }
    if (revNum < 0 || empNum < 0) {
      notify('Validation error: Revenue and employment cannot be negative.');
      return;
    }

    const { data, error } = await supabase
      .from('economic_records')
      .insert({
        reporting_date: econDate,
        destination: econDest,
        revenue_category: econCat,
        estimated_revenue_php: revNum,
        employment_count: empNum,
        verification_status: econVerified,
        notes: econNotes.trim() || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      notify(`Error: ${error.message}`);
      return;
    }
    await logAudit('CREATE', 'economic_record', data.id, {
      destination: econDest,
      revenue: revNum,
      status: econVerified,
    });
    setEconRev('0');
    setEconEmp('0');
    setEconNotes('');
    notify('Economic record saved.');
    await loadAllData();
  }

  async function handleAddIndicator(e: React.FormEvent) {
    e.preventDefault();
    const valNum = Number(indVal);
    const targetNum = Number(indTarget);
    if (!indName.trim() || !indUnit.trim() || !indPeriod.trim()) {
      notify('Validation error: Indicator name, unit, and period are required.');
      return;
    }

    const { data, error } = await supabase
      .from('sustainability_indicators')
      .insert({
        indicator_name: indName.trim(),
        category: indCat,
        metric_value: valNum,
        unit: indUnit.trim(),
        target_value: Number.isFinite(targetNum) ? targetNum : null,
        reporting_period: indPeriod.trim(),
        status: indStatus,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      notify(`Error: ${error.message}`);
      return;
    }
    await logAudit('CREATE', 'sustainability_indicator', data.id, {
      indicator_name: indName.trim(),
      category: indCat,
      status: indStatus,
    });
    setIndName('');
    notify('Sustainability indicator saved.');
    await loadAllData();
  }

  async function toggleArchive(
    table: 'arrival_records' | 'economic_records' | 'sustainability_indicators',
    id: string,
    currentlyArchived: boolean
  ) {
    const { error } = await supabase
      .from(table)
      .update({
        is_archived: !currentlyArchived,
        archived_at: !currentlyArchived ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) {
      notify(`Error: ${error.message}`);
      return;
    }
    await logAudit(currentlyArchived ? 'RESTORE' : 'ARCHIVE', table, id);
    notify(currentlyArchived ? 'Record restored.' : 'Record archived (preserved).');
    await loadAllData();
  }

  async function handleGenerateBrief() {
    setBriefLoading(true);
    setBriefNotice(null);
    try {
      const res = await fetch('/api/analytics/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recentArrivals: growthStats.recentArrivals,
          priorArrivals: growthStats.priorArrivals,
          growthRatePct: growthStats.growthRatePct,
          totalRevenuePhp: totalRevenue,
          verifiedRevenuePct:
            totalRevenue > 0 ? (verifiedRevenue / totalRevenue) * 100 : 0,
          employmentCount: totalEmployment,
          satisfactionScore: satisfaction.averageScore,
          satisfactionCount: satisfaction.totalRatings,
          watchIndicators: activeIndicators
            .filter((i) => i.status !== 'on_track')
            .map((i) => i.indicator_name),
          topDestinations: destinationTotals.slice(0, 5),
        }),
      });
      const json = await res.json();
      setBriefText(json.brief);
      setBriefNotice(json.notice);
    } catch {
      setBriefNotice('Failed to contact AI brief endpoint.');
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleGenerateReport(e: React.FormEvent) {
    e.preventDefault();
    if (repStart > repEnd) {
      notify('Validation error: Start date cannot be after end date.');
      return;
    }
    const text = buildTextReport({
      reportType: repType,
      periodStart: repStart,
      periodEnd: repEnd,
      arrivals,
      economics,
      indicators,
      satisfaction,
      forecast,
    });
    setLatestReportText(text);

    const { data, error } = await supabase
      .from('report_history')
      .insert({
        report_type: repType,
        period_start: repStart,
        period_end: repEnd,
        summary_text: text,
        metrics_snapshot: {
          totalArrivals,
          totalRevenue,
          totalEmployment,
          satisfactionScore: satisfaction.averageScore,
        },
        generated_by: userId,
      })
      .select()
      .single();

    if (!error && data) {
      await logAudit('GENERATE_REPORT', 'report_history', data.id, {
        report_type: repType,
        period_start: repStart,
        period_end: repEnd,
      });
      notify('Report generated and saved to history.');
      await loadAllData();
    }
  }

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleTestIngest(e: React.FormEvent) {
    e.preventDefault();
    setIngResult(null);
    const payload =
      ingEvent === 'satisfaction_rating'
        ? { destination: ingDest, rating: Number(ingRating) }
        : ingEvent === 'arrival_count'
          ? {
              destination: ingDest,
              visitor_type: 'day_visitor',
              local_count: 45,
              foreign_count: 6,
            }
          : {
              destination: ingDest,
              revenue_category: 'tours_and_activities',
              estimated_revenue_php: 28500,
              employment_count: 4,
            };

    const res = await fetch('/api/analytics/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-key': ingKey,
      },
      body: JSON.stringify({
        subsystem_id: ingSub,
        event_type: ingEvent,
        payload,
      }),
    });
    const json = await res.json();
    setIngResult(JSON.stringify(json, null, 2));
    await loadAllData();
  }

  async function handleRoleChange(targetId: string, newRole: AdminRole) {
    const { error } = await supabase
      .from('admin_profiles')
      .update({ role: newRole })
      .eq('id', targetId);
    if (error) {
      notify(`Role update failed: ${error.message}`);
      return;
    }
    await logAudit('MANAGE_ADMIN', 'admin_profiles', targetId, { newRole });
    notify('Administrator role updated.');
    await loadAllData();
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading TIA-DAS workspace...
      </div>
    );
  }

  if (!userId) {
    return <AuthGate onAuthenticated={checkSession} />;
  }

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: 'overview',
      label: 'Overview & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    { key: 'arrivals', label: 'Arrivals', icon: <Users className="w-4 h-4" /> },
    {
      key: 'economics',
      label: 'Economic Impact',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      key: 'sustainability',
      label: 'Sustainability (SF-MST)',
      icon: <Leaf className="w-4 h-4" />,
    },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
    {
      key: 'integration',
      label: 'Ingest API & Sources',
      icon: <Database className="w-4 h-4" />,
    },
    {
      key: 'admin',
      label: 'Admin & Audit Log',
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              10
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  CONNECT-DAET.ph
                </span>
                <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  TIA-DAS · Subsystem 10
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Municipal Tourism Office of Daet, Camarines Norte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`}
              />
            </button>
            <div className="hidden md:block text-right">
              <div className="text-xs font-semibold text-slate-900">
                {profile?.full_name || userEmail}
              </div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                {profile?.role || 'admin'}
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUserId(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === item.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Total Tourist Arrivals
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {totalArrivals.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Local: {totalLocal.toLocaleString()} · Foreign:{' '}
                  {totalForeign.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  30-Day Arrival Growth
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {growthStats.growthRatePct !== null
                    ? `${growthStats.growthRatePct >= 0 ? '+' : ''}${growthStats.growthRatePct}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Last 30d: {growthStats.recentArrivals.toLocaleString()} vs
                  Prior: {growthStats.priorArrivals.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  Estimated Tourism Revenue
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₱{totalRevenue.toLocaleString('en-PH')}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Verified:{' '}
                  {totalRevenue > 0
                    ? `${((verifiedRevenue / totalRevenue) * 100).toFixed(1)}%`
                    : '0%'}{' '}
                  · Jobs: {totalEmployment.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">
                  3-Month Rolling Forecast
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {forecast
                    ? `~${forecast.estimatedArrivals.toLocaleString()}`
                    : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {forecast
                    ? `${forecast.nextMonthLabel} (Trend-Based Estimate)`
                    : 'Insufficient monthly data'}
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthlyArrivalsChart buckets={monthlyBuckets} />
              <RevenueTrendChart buckets={monthlyBuckets} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DestinationBreakdownCard destinations={destinationTotals} />
              <SatisfactionCard summary={satisfaction} />

              {/* AI Tourism Brief Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      AI Tourism Brief (30-Day)
                    </h3>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Google Gemini
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Generates a concise summary from aggregated 30-day metrics.
                    Subject to staff review.
                  </p>

                  {briefNotice && (
                    <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      {briefNotice}
                    </p>
                  )}

                  {briefText ? (
                    <div className="mt-3 text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-52 overflow-y-auto bg-slate-50 rounded-xl p-3 border border-slate-100">
                      {briefText}
                    </div>
                  ) : (
                    <div className="mt-6 text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                      Click Generate Brief to analyze the latest 30-day metrics.
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGenerateBrief}
                  disabled={briefLoading}
                  className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold py-2.5 flex items-center justify-center gap-2 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {briefLoading ? 'Generating Brief...' : 'Generate 30-Day Brief'}
                </button>
              </div>
            </div>

            {/* Rule-Based Insights + Forecast Basis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Rule-Based Analytical Insights
                </h3>
                <div className="space-y-3">
                  {ruleInsights.map((ins) => {
                    const styles =
                      ins.severity === 'positive'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : ins.severity === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-blue-50 border-blue-200 text-blue-900';
                    return (
                      <div
                        key={ins.id}
                        className={`rounded-xl border p-3.5 text-xs ${styles}`}
                      >
                        <div className="font-semibold">{ins.title}</div>
                        <p className="mt-1 opacity-90">{ins.message}</p>
                        <p className="mt-1.5 font-medium">
                          Recommendation: {ins.recommendation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  Forecast Computation Basis
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Transparent rolling average with fixed 1.05 growth factor (not
                  a guaranteed prediction).
                </p>
                {forecast ? (
                  <div className="space-y-2 text-xs">
                    {forecast.basisMonths.map((m) => (
                      <div
                        key={m.label}
                        className="flex justify-between py-1.5 border-b border-slate-100"
                      >
                        <span className="text-slate-600">{m.label}</span>
                        <span className="font-semibold text-slate-900">
                          {m.total.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      Â_next = {forecast.formulaLabel} ={' '}
                      {forecast.estimatedArrivals.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Add arrival records to compute forecast.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'arrivals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {canWrite && (
              <form
                onSubmit={handleAddArrival}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3.5 h-fit"
              >
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Record Tourist Arrivals
                </h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reporting Date
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    required
                    value={arrDate}
                    onChange={(e) => setArrDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Destination
                  </label>
                  <select
                    value={arrDest}
                    onChange={(e) => setArrDest(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    {DAET_DESTINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Visitor Type
                  </label>
                  <select
                    value={arrType}
                    onChange={(e) =>
                      setArrType(
                        e.target.value as ArrivalRecord['visitor_type']
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="day_visitor">Day Visitor</option>
                    <option value="overnight">Overnight</option>
                    <option value="excursionist">Excursionist</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Local Count
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={arrLocal}
                      onChange={(e) => setArrLocal(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Foreign Count
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={arrForeign}
                      onChange={(e) => setArrForeign(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Source
                  </label>
                  <select
                    value={arrSourceId}
                    onChange={(e) => setArrSourceId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="">Select data source (optional)</option>
                    {dataSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={arrNotes}
                    onChange={(e) => setArrNotes(e.target.value)}
                    placeholder="Optional remarks"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 transition"
                >
                  Save Arrival Record
                </button>
              </form>
            )}

            <div
              className={`${canWrite ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl border border-slate-200 p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Arrival Records
                </h2>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show archived
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Destination</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Local</th>
                      <th className="py-2 pr-3">Foreign</th>
                      <th className="py-2 pr-3">Total</th>
                      {canWrite && <th className="py-2 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arrivals
                      .filter((r) => showArchived || !r.is_archived)
                      .map((r) => (
                        <tr
                          key={r.id}
                          className={r.is_archived ? 'opacity-50 bg-slate-50' : ''}
                        >
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {r.reporting_date}
                          </td>
                          <td className="py-2.5 pr-3 font-medium text-slate-900">
                            {r.destination}
                          </td>
                          <td className="py-2.5 pr-3 capitalize">
                            {r.visitor_type.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 pr-3">
                            {r.local_count.toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-3">
                            {r.foreign_count.toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-3 font-semibold">
                            {(r.local_count + r.foreign_count).toLocaleString()}
                          </td>
                          {canWrite && (
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() =>
                                  toggleArchive(
                                    'arrival_records',
                                    r.id,
                                    r.is_archived
                                  )
                                }
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"
                              >
                                {r.is_archived ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3.5 h-3.5" /> Archive
                                  </>
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'economics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {canWrite && (
              <form
                onSubmit={handleAddEconomic}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3.5 h-fit"
              >
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Record Economic Impact
                </h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reporting Date
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    required
                    value={econDate}
                    onChange={(e) => setEconDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Destination
                  </label>
                  <select
                    value={econDest}
                    onChange={(e) => setEconDest(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    {DAET_DESTINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Revenue Category
                  </label>
                  <select
                    value={econCat}
                    onChange={(e) =>
                      setEconCat(
                        e.target.value as EconomicRecord['revenue_category']
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="accommodation">Accommodation</option>
                    <option value="food_and_beverage">Food & Beverage</option>
                    <option value="tours_and_activities">
                      Tours & Activities
                    </option>
                    <option value="transport">Transport</option>
                    <option value="souvenirs_and_retail">
                      Souvenirs & Retail
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Revenue (PHP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={econRev}
                      onChange={(e) => setEconRev(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Employment
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={econEmp}
                      onChange={(e) => setEconEmp(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Classification
                  </label>
                  <select
                    value={econVerified}
                    onChange={(e) =>
                      setEconVerified(
                        e.target.value as EconomicRecord['verification_status']
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="verified">Verified Record</option>
                    <option value="estimated">Estimated Figure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={econNotes}
                    onChange={(e) => setEconNotes(e.target.value)}
                    placeholder="Source or filing note"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 transition"
                >
                  Save Economic Record
                </button>
              </form>
            )}

            <div
              className={`${canWrite ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl border border-slate-200 p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Economic & Employment Records
                </h2>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show archived
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Destination</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Revenue (₱)</th>
                      <th className="py-2 pr-3">Jobs</th>
                      <th className="py-2 pr-3">Status</th>
                      {canWrite && <th className="py-2 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {economics
                      .filter((r) => showArchived || !r.is_archived)
                      .map((r) => (
                        <tr
                          key={r.id}
                          className={r.is_archived ? 'opacity-50 bg-slate-50' : ''}
                        >
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {r.reporting_date}
                          </td>
                          <td className="py-2.5 pr-3 font-medium text-slate-900">
                            {r.destination}
                          </td>
                          <td className="py-2.5 pr-3 capitalize">
                            {r.revenue_category.replaceAll('_', ' ')}
                          </td>
                          <td className="py-2.5 pr-3 font-semibold">
                            ₱
                            {Number(r.estimated_revenue_php).toLocaleString(
                              'en-PH'
                            )}
                          </td>
                          <td className="py-2.5 pr-3">{r.employment_count}</td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                r.verification_status === 'verified'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {r.verification_status}
                            </span>
                          </td>
                          {canWrite && (
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() =>
                                  toggleArchive(
                                    'economic_records',
                                    r.id,
                                    r.is_archived
                                  )
                                }
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"
                              >
                                {r.is_archived ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                                  </>
                                ) : (
                                  <>
                                    <Archive className="w-3.5 h-3.5" /> Archive
                                  </>
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sustainability' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {canWrite && (
              <form
                onSubmit={handleAddIndicator}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3.5 h-fit"
              >
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Add Sustainability Indicator
                </h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Indicator Name
                  </label>
                  <input
                    type="text"
                    required
                    value={indName}
                    onChange={(e) => setIndName(e.target.value)}
                    placeholder="e.g. Coastal Waste Diversion Rate"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    SF-MST Dimension
                  </label>
                  <select
                    value={indCat}
                    onChange={(e) =>
                      setIndCat(e.target.value as SustainabilityCategory)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  >
                    <option value="environmental">Environmental</option>
                    <option value="economic">Economic</option>
                    <option value="social">Social</option>
                    <option value="governance">Governance</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={indVal}
                      onChange={(e) => setIndVal(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      required
                      value={indUnit}
                      onChange={(e) => setIndUnit(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Target
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={indTarget}
                      onChange={(e) => setIndTarget(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Period
                    </label>
                    <input
                      type="text"
                      required
                      value={indPeriod}
                      onChange={(e) => setIndPeriod(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={indStatus}
                      onChange={(e) =>
                        setIndStatus(
                          e.target.value as SustainabilityIndicator['status']
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    >
                      <option value="on_track">On Track</option>
                      <option value="watch">Watch</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 transition"
                >
                  Save Indicator
                </button>
              </form>
            )}

            <div
              className={`${canWrite ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}
            >
              {(
                ['environmental', 'economic', 'social', 'governance'] as const
              ).map((cat) => {
                const items = indicators.filter(
                  (i) =>
                    i.category === cat && (showArchived || !i.is_archived)
                );
                return (
                  <div
                    key={cat}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                  >
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                      {cat} Dimension
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((i) => (
                        <div
                          key={i.id}
                          className="rounded-xl border border-slate-200 p-3.5 flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              {i.indicator_name}
                            </div>
                            <div className="text-lg font-bold text-slate-900 mt-1">
                              {i.metric_value}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                {i.unit}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Target: {i.target_value ?? '—'} {i.unit} ·{' '}
                              {i.reporting_period}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                i.status === 'on_track'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : i.status === 'watch'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {i.status.replace('_', ' ')}
                            </span>
                            {canWrite && (
                              <button
                                onClick={() =>
                                  toggleArchive(
                                    'sustainability_indicators',
                                    i.id,
                                    i.is_archived
                                  )
                                }
                                className="text-[11px] text-slate-400 hover:text-slate-700"
                              >
                                {i.is_archived ? 'Restore' : 'Archive'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleGenerateReport}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3.5 h-fit"
            >
              <h2 className="text-base font-semibold text-slate-900">
                Generate Municipal Report
              </h2>
              <p className="text-xs text-slate-500">
                Exports aggregated tourism impact and sustainability data as a
                plain-text (.txt) report.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Report Type
                </label>
                <select
                  value={repType}
                  onChange={(e) =>
                    setRepType(e.target.value as ReportHistory['report_type'])
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  <option value="monthly_impact">Monthly Impact Report</option>
                  <option value="quarterly_sustainability">
                    Quarterly Sustainability Report
                  </option>
                  <option value="economic_assessment">
                    Economic Assessment Report
                  </option>
                  <option value="destination_breakdown">
                    Destination Breakdown Report
                  </option>
                  <option value="annual_summary">Annual Summary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Period Start
                </label>
                <input
                  type="date"
                  required
                  value={repStart}
                  onChange={(e) => setRepStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Period End
                </label>
                <input
                  type="date"
                  required
                  value={repEnd}
                  onChange={(e) => setRepEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 transition"
              >
                Generate & Save Report
              </button>
            </form>

            <div className="lg:col-span-2 space-y-6">
              {latestReportText && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Generated Report Preview
                    </h3>
                    <button
                      onClick={() =>
                        downloadTextFile(
                          `tia-das-${repType}-${repStart}-to-${repEnd}.txt`,
                          latestReportText
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download .txt
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                    {latestReportText}
                  </pre>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Report History
                </h3>
                {reports.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No reports generated yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {reports.map((rep) => (
                      <div
                        key={rep.id}
                        className="py-3 flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 capitalize">
                            {rep.report_type.replaceAll('_', ' ')}
                          </div>
                          <div className="text-slate-500">
                            {rep.period_start} to {rep.period_end} · Created{' '}
                            {new Date(rep.created_at).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            downloadTextFile(
                              `tia-das-${rep.report_type}-${rep.period_start}.txt`,
                              rep.summary_text
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          .txt
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integration' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleTestIngest}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3.5 h-fit"
            >
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                Test /api/analytics/ingest
              </h2>
              <p className="text-xs text-slate-500">
                Simulates passive event ingestion from Subsystems 5, 6, 7, 8, 9,
                and 11.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Subsystem
                </label>
                <select
                  value={ingSub}
                  onChange={(e) => setIngSub(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  <option value="subsystem_5">
                    Subsystem 5: Programs & Events
                  </option>
                  <option value="subsystem_6">
                    Subsystem 6: Crisis Communication
                  </option>
                  <option value="subsystem_7">
                    Subsystem 7: Artisan E-Commerce
                  </option>
                  <option value="subsystem_8">Subsystem 8: Tour Booking</option>
                  <option value="subsystem_9">
                    Subsystem 9: Emoji Sentiment
                  </option>
                  <option value="subsystem_11">
                    Subsystem 11: Tourist Rewards
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  x-ingest-key
                </label>
                <input
                  type="text"
                  value={ingKey}
                  onChange={(e) => setIngKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Event Type
                </label>
                <select
                  value={ingEvent}
                  onChange={(e) => setIngEvent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  <option value="satisfaction_rating">
                    satisfaction_rating (1–5)
                  </option>
                  <option value="arrival_count">arrival_count</option>
                  <option value="economic_activity">economic_activity</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Destination
                </label>
                <select
                  value={ingDest}
                  onChange={(e) => setIngDest(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  {DAET_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              {ingEvent === 'satisfaction_rating' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rating (1.0 – 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={ingRating}
                    onChange={(e) => setIngRating(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5"
              >
                Send Ingest Event
              </button>
              {ingResult && (
                <pre className="text-[11px] font-mono bg-slate-900 text-emerald-300 p-3 rounded-xl overflow-x-auto">
                  {ingResult}
                </pre>
              )}
            </form>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Data Source Registry
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dataSources.map((src) => (
                    <div
                      key={src.id}
                      className="rounded-xl border border-slate-200 p-3 text-xs"
                    >
                      <div className="font-semibold text-slate-900">
                        {src.name}
                      </div>
                      <div className="text-slate-500 mt-0.5 capitalize">
                        {src.source_type.replace('_', ' ')} ·{' '}
                        {src.contact_office || 'CONNECT-DAET'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Import Logs
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Received</th>
                        <th className="py-2 pr-3">Subsystem</th>
                        <th className="py-2 pr-3">Event</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2 pr-3 whitespace-nowrap text-slate-500">
                            {new Date(log.received_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 font-mono">
                            {log.subsystem_id}
                          </td>
                          <td className="py-2 pr-3">{log.event_type}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                log.status === 'accepted'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 text-slate-500">
                            {log.error_message || 'Processed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Administrator Accounts & Roles
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Supports four roles: Super Administrator, Tourism
                Administrator, Data Analyst, and Report Viewer.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Name</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Role</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admins.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-3 font-medium text-slate-900">
                          {a.full_name}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          {a.email}
                        </td>
                        <td className="py-2.5 pr-3">
                          {profile?.role === 'super_admin' ? (
                            <select
                              value={a.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  a.id,
                                  e.target.value as AdminRole
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="super_admin">super_admin</option>
                              <option value="tourism_admin">
                                tourism_admin
                              </option>
                              <option value="data_analyst">data_analyst</option>
                              <option value="report_viewer">
                                report_viewer
                              </option>
                            </select>
                          ) : (
                            <span className="font-mono">{a.role}</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px]">
                            {a.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Immutable Audit Log
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Append-only chronological record of administrator actions and
                subsystem ingestions. Updates and deletions are blocked by RLS.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Timestamp</th>
                      <th className="py-2 pr-3">Actor</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Entity</th>
                      <th className="py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 pr-3 whitespace-nowrap text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3">
                          {log.actor_email || 'system'}
                        </td>
                        <td className="py-2 pr-3 font-mono font-semibold text-blue-700">
                          {log.action}
                        </td>
                        <td className="py-2 pr-3">{log.entity_type}</td>
                        <td className="py-2 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
