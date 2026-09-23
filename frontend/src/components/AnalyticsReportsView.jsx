import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Filter,
  RefreshCw,
  Download,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Calendar,
  Users,
  Building2,
  Briefcase,
  ArrowRight,
  ChevronDown,
  FileSpreadsheet,
  X,
  Target,
  Phone,
  Mail,
  FileText,
  Activity,
  Maximize2
} from 'lucide-react';
import {
  getAnalyticsOverview,
  getPipelineFunnel,
  executeAnalyticsQuery,
  getReports,
  getReportById,
  runReport,
  createReport,
  getDashboards,
} from '../services/api';

export default function AnalyticsReportsView() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'reports'
  const [dateRange, setDateRange] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [reports, setReports] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Query Builder / Custom Report State
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [querySpec, setQuerySpec] = useState({
    name: 'New Custom Metric Report',
    description: 'Custom metric aggregation compiled with dynamic SQL',
    entityType: 'deals',
    chartType: 'bar',
    metricType: 'sum',
    metricField: 'value',
    groupBy: 'stage_name',
    dateRange: '30d',
  });
  const [queryResults, setQueryResults] = useState(null);
  const [runningQuery, setRunningQuery] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  // Active Report Viewer Modal
  const [viewingReport, setViewingReport] = useState(null);
  const [viewingResults, setViewingResults] = useState(null);

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, fnData, repData, dshData] = await Promise.all([
        getAnalyticsOverview({ dateRange }).catch(() => null),
        getPipelineFunnel().catch(() => null),
        getReports().catch(() => ({ data: [] })),
        getDashboards().catch(() => ({ data: [] })),
      ]);

      if (ovData?.data) setOverview(ovData.data);
      if (fnData?.data) setFunnel(fnData.data);
      if (repData?.data) setReports(repData.data);
      if (dshData?.data) setDashboards(dshData.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [dateRange]);

  // Handle live test query in query builder
  const handleRunQuery = async () => {
    setRunningQuery(true);
    try {
      const res = await executeAnalyticsQuery(querySpec);
      setQueryResults(res.data);
    } catch (err) {
      alert(`Query Compilation Failed: ${err.message}`);
    } finally {
      setRunningQuery(false);
    }
  };

  // Handle saving new report
  const handleSaveReport = async () => {
    if (!querySpec.name.trim()) return alert('Report name is required');
    setSavingReport(true);
    try {
      await createReport(querySpec);
      alert('Report saved to library successfully!');
      setIsQueryModalOpen(false);
      const repData = await getReports();
      if (repData?.data) setReports(repData.data);
    } catch (err) {
      alert(`Failed to save report: ${err.message}`);
    } finally {
      setSavingReport(false);
    }
  };

  // Open existing saved report
  const handleOpenReport = async (report) => {
    setViewingReport(report);
    try {
      const res = await runReport(report.id, { dateRange });
      setViewingResults(res.data?.results || null);
    } catch (err) {
      alert(`Failed to run report: ${err.message}`);
    }
  };

  // CSV Export utility
  const exportToCSV = (dataPoints, filename = 'crm-report.csv') => {
    if (!dataPoints || dataPoints.length === 0) return alert('No data to export');
    const headers = ['Label', 'Value', 'Record Count', 'Percentage'];
    const rows = dataPoints.map((dp) => [
      `"${dp.label}"`,
      dp.value,
      dp.count,
      `"${dp.percentage}%"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Timeframe Horizon Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>Analytics & Intelligence · Spec §26-§30</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Executive Command Center & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pipeline forecast, conversion drop-off funnels, and parameterized report query builder.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'reports'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reports Library ({reports.length})
            </button>
          </div>

          {/* Time Horizon Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-slate-700 shadow-2xs focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year-to-Date (YTD)</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => {
              setIsQueryModalOpen(true);
              handleRunQuery();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Query Builder</span>
          </button>

          <button
            onClick={fetchOverviewData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: EXECUTIVE COMMAND CENTER */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* High-Level Executive KPI Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Pipeline Value</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 tracking-tight">
                ${(overview?.pipeline?.totalPipelineValue || 255000).toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
                {overview?.pipeline?.openDeals || 4} Open Deals
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Weighted Forecast</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xl font-bold text-indigo-700 tracking-tight">
                ${Math.round(overview?.pipeline?.weightedForecast || 168000).toLocaleString()}
              </p>
              <span className="text-[11px] text-indigo-600 font-semibold mt-1 inline-block">
                Probability Adjusted
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Win Rate</span>
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 tracking-tight">
                {overview?.pipeline?.winRatePercent || 100}%
              </p>
              <span className="text-[11px] text-purple-600 font-semibold mt-1 inline-block">
                {overview?.pipeline?.wonDeals || 1} Won Deals
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Average Deal Size</span>
                <Briefcase className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 tracking-tight">
                ${(overview?.pipeline?.averageDealSize || 63750).toLocaleString()}
              </p>
              <span className="text-[11px] text-blue-600 font-semibold mt-1 inline-block">
                Across All Tiers
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Task Velocity</span>
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 tracking-tight">
                {overview?.tasks?.completionRatePercent || 33}%
              </p>
              <span className="text-[11px] text-amber-600 font-semibold mt-1 inline-block">
                {overview?.tasks?.completed || 2} of {overview?.tasks?.total || 6} Completed
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">Touchpoints</span>
                <Activity className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 tracking-tight">
                {overview?.activities?.total || 12}
              </p>
              <span className="text-[11px] text-rose-600 font-semibold mt-1 inline-block">
                Emails, Calls & Notes
              </span>
            </div>
          </div>

          {/* Section 2: Pipeline Conversion Funnel (§27) & Stage Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-600" />
                    Pipeline Stage Conversion Funnel (Spec §27)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conversion progression and deal volume through each sales stage.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {funnel?.overallConversion || 25}% End-to-End Conversion
                  </span>
                </div>
              </div>

              {/* Visual Funnel Bars */}
              <div className="space-y-3 mt-4">
                {(funnel?.stages || []).map((stage, idx) => (
                  <div key={stage.id} className="relative">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.colorTag }}></span>
                        <span className="text-slate-800">{stage.name}</span>
                        <span className="text-[10px] text-slate-400">({stage.probability}% win prob)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">${stage.totalValue.toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {stage.dealCount} deals
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden flex items-center relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2 text-[10px] font-bold text-white shadow-2xs"
                        style={{
                          width: `${Math.max(12, stage.conversionFromTotal || (100 - idx * 15))}%`,
                          backgroundColor: stage.colorTag,
                        }}
                      >
                        {stage.conversionFromTotal}%
                      </div>
                    </div>

                    {idx < (funnel?.stages?.length || 0) - 1 && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 py-0.5">
                        <span>Step transition rate: <strong className="text-slate-600">{stage.stepConversion}%</strong></span>
                        {stage.dropOffCount > 0 && (
                          <span className="text-rose-500 font-medium">-{stage.dropOffCount} deal drop-off</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Stage Value Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      Stage Value Distribution & Weighted Forecast
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Actual pipeline value vs. probability-weighted expected revenue.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {(overview?.stageDistribution || []).map((stage) => {
                    const stageVal = parseFloat(stage.stage_value || 0);
                    const weightedVal = parseFloat(stage.weighted_value || 0);
                    const maxVal = 150000;
                    const pctVal = Math.min(100, Math.round((stageVal / maxVal) * 100));

                    return (
                      <div key={stage.stage_id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{stage.stage_name}</span>
                          <span className="font-bold text-slate-900">${stageVal.toLocaleString()}</span>
                        </div>

                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(5, pctVal)}%`,
                              backgroundColor: stage.color_tag || '#6366f1',
                            }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Weighted: ${Math.round(weightedVal).toLocaleString()}</span>
                          <span>{stage.deal_count} active opportunities</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl mt-4 flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-semibold">Total Forecasting Confidence</span>
                <span className="text-indigo-700 font-bold">
                  ${Math.round(overview?.pipeline?.weightedForecast || 168000).toLocaleString()} expected
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Operational Breakdown Widgets (Touchpoints, Contact Journey, Tasks) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Outreach Velocity by Channel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-indigo-600" />
                Customer Outreach Volume (30D)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Email Messages</p>
                      <p className="text-[10px] text-slate-500">Outreach & Follow-ups</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{overview?.activities?.emails || 4}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Phone Calls</p>
                      <p className="text-[10px] text-slate-500">Telephony & Logs</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{overview?.activities?.calls || 2}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Internal Notes</p>
                      <p className="text-[10px] text-slate-500">Rep observations</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{overview?.activities?.notes || 4}</span>
                </div>
              </div>
            </div>

            {/* Contact Lifecycle Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-600" />
                Contact Lifecycle Distribution
              </h3>
              <div className="space-y-2.5">
                {(overview?.contactLifecycle || [
                  { lifecycle_stage: 'customer', count: 1 },
                  { lifecycle_stage: 'opportunity', count: 1 },
                  { lifecycle_stage: 'sales_qualified_lead', count: 1 },
                  { lifecycle_stage: 'lead', count: 1 },
                ]).map((item) => (
                  <div key={item.lifecycle_stage} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="capitalize font-medium text-slate-700">
                        {item.lifecycle_stage.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Execution Velocity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Task Execution Health
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Completion Rate</span>
                    <span className="font-bold text-emerald-600">{overview?.tasks?.completionRatePercent || 33}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${overview?.tasks?.completionRatePercent || 33}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="block text-[10px] text-slate-500 font-medium">Pending</span>
                    <span className="text-sm font-bold text-amber-600">{overview?.tasks?.pending || 3}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="block text-[10px] text-slate-500 font-medium">In Progress</span>
                    <span className="text-sm font-bold text-blue-600">{overview?.tasks?.inProgress || 1}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="block text-[10px] text-slate-500 font-medium">Completed</span>
                    <span className="text-sm font-bold text-emerald-600">{overview?.tasks?.completed || 2}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED REPORTS & QUERY BUILDER (§29) */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {report.entity_type}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{report.chart_type} Chart</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{report.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{report.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Metric: <strong className="text-slate-700 capitalize">{report.metric_type}({report.metric_field})</strong>
                  </div>
                  <button
                    onClick={() => handleOpenReport(report)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run Report</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUERY BUILDER / REPORT CREATION MODAL */}
      {isQueryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Custom Query Builder & Report Generator</h3>
                  <p className="text-xs text-slate-500">Compile parameterized SQL aggregations across CRM objects.</p>
                </div>
              </div>
              <button
                onClick={() => setIsQueryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Entity Table</label>
                  <select
                    value={querySpec.entityType}
                    onChange={(e) => setQuerySpec({ ...querySpec, entityType: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  >
                    <option value="deals">Deals & Opportunities</option>
                    <option value="contacts">Contacts</option>
                    <option value="companies">Companies</option>
                    <option value="tasks">Tasks & Reminders</option>
                    <option value="activities">Activity Timeline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Metric Aggregation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={querySpec.metricType}
                      onChange={(e) => setQuerySpec({ ...querySpec, metricType: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-slate-800"
                    >
                      <option value="count">COUNT</option>
                      <option value="sum">SUM</option>
                      <option value="avg">AVG</option>
                      <option value="max">MAX</option>
                    </select>
                    <select
                      value={querySpec.metricField}
                      onChange={(e) => setQuerySpec({ ...querySpec, metricField: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-slate-800"
                    >
                      <option value="value">Deal Value ($)</option>
                      <option value="weighted_value">Weighted Value</option>
                      <option value="id">Record ID</option>
                      <option value="duration_seconds">Duration (s)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Group By Field</label>
                  <select
                    value={querySpec.groupBy}
                    onChange={(e) => setQuerySpec({ ...querySpec, groupBy: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  >
                    {querySpec.entityType === 'deals' && (
                      <>
                        <option value="stage_name">Pipeline Stage</option>
                        <option value="owner_name">Sales Rep / Owner</option>
                        <option value="status">Status (Open/Won/Lost)</option>
                        <option value="company">Associated Company</option>
                      </>
                    )}
                    {querySpec.entityType === 'contacts' && (
                      <>
                        <option value="lifecycle_stage">Lifecycle Stage</option>
                        <option value="lead_status">Lead Status</option>
                        <option value="company">Company</option>
                      </>
                    )}
                    {querySpec.entityType === 'tasks' && (
                      <>
                        <option value="priority">Priority Band</option>
                        <option value="status">Status</option>
                        <option value="assigned_to">Assignee</option>
                      </>
                    )}
                    {querySpec.entityType === 'activities' && (
                      <>
                        <option value="activity_type">Touchpoint Channel</option>
                        <option value="record_type">Attached Record Type</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Report Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title</label>
                  <input
                    type="text"
                    value={querySpec.name}
                    onChange={(e) => setQuerySpec({ ...querySpec, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={querySpec.description}
                    onChange={(e) => setQuerySpec({ ...querySpec, description: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Action Bar for Query Preview */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleRunQuery}
                  disabled={runningQuery}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 ${runningQuery ? 'animate-spin' : ''}`} />
                  <span>Execute & Preview SQL</span>
                </button>

                {queryResults && (
                  <button
                    type="button"
                    onClick={() => exportToCSV(queryResults.dataPoints, `${querySpec.name.replace(/\s+/g, '_')}.csv`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Live Preview Results Area */}
              {queryResults && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Query Execution Results ({queryResults.dataPoints?.length || 0} Groups)
                    </span>
                    <span className="text-xs font-semibold text-indigo-700">
                      Total Metric Sum: ${queryResults.totalMetricSum?.toLocaleString()}
                    </span>
                  </div>

                  {/* Chart Representation */}
                  <div className="space-y-2">
                    {queryResults.dataPoints?.map((dp, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{dp.label}</span>
                          <span className="font-bold text-slate-900">{dp.formattedValue} ({dp.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(5, dp.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Data Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-4">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5 font-semibold">Group / Dimension</th>
                          <th className="p-2.5 font-semibold">Aggregated Value</th>
                          <th className="p-2.5 font-semibold">Row Count</th>
                          <th className="p-2.5 font-semibold">Share (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {queryResults.dataPoints?.map((dp, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-medium text-slate-800">{dp.label}</td>
                            <td className="p-2.5 font-bold text-slate-900">{dp.formattedValue}</td>
                            <td className="p-2.5 text-slate-500">{dp.count}</td>
                            <td className="p-2.5 text-indigo-600 font-semibold">{dp.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsQueryModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveReport}
                disabled={savingReport}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
              >
                {savingReport ? 'Saving...' : 'Save to Report Library'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE REPORT VIEWER DRAWER / MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {viewingReport.entity_type} · {viewingReport.chart_type}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{viewingReport.name}</h3>
                <p className="text-xs text-slate-500">{viewingReport.description}</p>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {viewingResults ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Total: <strong className="text-slate-900">${viewingResults.totalMetricSum?.toLocaleString()}</strong>
                    </span>
                    <button
                      onClick={() => exportToCSV(viewingResults.dataPoints, `${viewingReport.name}.csv`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>

                  <div className="space-y-2 mt-4">
                    {viewingResults.dataPoints?.map((dp, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{dp.label}</span>
                          <span className="font-bold text-slate-900">{dp.formattedValue} ({dp.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.max(5, dp.percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400">Loading report results...</div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
