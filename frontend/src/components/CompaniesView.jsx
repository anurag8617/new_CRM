import React, { useState, useEffect } from 'react';
import { getCompanies, createCompany, deleteCompany } from '../services/api';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Globe, 
  Users, 
  RefreshCw, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { Button, Card, Badge, Modal } from './ui';

export default function CompaniesView({ onSelectCompany }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    industry: 'Enterprise Software',
    annualRevenue: '',
    employeeCount: '',
    phone: '',
    city: '',
    state: '',
    description: '',
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await getCompanies({ search });
      if (res.success) {
        setCompanies(res.data.companies || []);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this company account? Related contacts will remain in the database.')) return;
    try {
      await deleteCompany(id);
      await fetchCompanies();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createCompany(formData);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        domain: '',
        industry: 'Enterprise Software',
        annualRevenue: '',
        employeeCount: '',
        phone: '',
        city: '',
        state: '',
        description: '',
      });
      await fetchCompanies();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Creation failed');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Companies</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Accounts, corporate hierarchies, annual revenues, and associated contacts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCompanies}
            disabled={loading}
            className="p-2 text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            title="Refresh Companies"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            icon={Plus}
          >
            New Company
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search companies by name, domain, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>

        <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
          {companies.length} records
        </span>
      </div>

      {/* Companies Table (§6.4) */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface-raised)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="h-10 bg-[var(--bg-app)] border-b border-[var(--border-default)] text-[var(--text-secondary)] font-medium">
                <th className="py-2.5 px-4 font-medium">Company Name</th>
                <th className="py-2.5 px-4 font-medium">Industry</th>
                <th className="py-2.5 px-4 font-medium">Annual Revenue</th>
                <th className="py-2.5 px-4 font-medium">Employees</th>
                <th className="py-2.5 px-4 font-medium">Location</th>
                <th className="py-2.5 px-4 font-medium">Contacts</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading && companies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[var(--text-tertiary)]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--text-tertiary)]" />
                    <span>Loading company accounts...</span>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[var(--text-tertiary)]">
                    No companies matching query.
                  </td>
                </tr>
              ) : (
                companies.map((comp) => (
                  <tr
                    key={comp.id}
                    className="h-10 hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center font-medium text-xs shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
                            <span>{comp.name}</span>
                            {comp.parent_company_name && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-[var(--bg-active)] text-[var(--text-tertiary)] rounded font-normal">
                                Sub of {comp.parent_company_name}
                              </span>
                            )}
                          </p>
                          {comp.domain && (
                            <a
                              href={`https://${comp.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Globe className="w-3 h-3 text-[var(--text-tertiary)]" />
                              <span>{comp.domain}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                      <Badge variant="neutral">
                        {comp.industry || 'General'}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-4 font-mono tabular-nums text-[var(--text-primary)]">
                      {comp.annual_revenue ? `$${Number(comp.annual_revenue).toLocaleString()}` : '—'}
                    </td>

                    <td className="py-2.5 px-4 text-[var(--text-secondary)] tabular-nums">
                      {comp.employee_count ? `${comp.employee_count} FTE` : '—'}
                    </td>

                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                      {comp.city ? `${comp.city}, ${comp.state || ''}` : comp.country || '—'}
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] tabular-nums">
                        <Users className="w-3 h-3 text-[var(--text-tertiary)]" />
                        <span>{comp.contacts_count}</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => handleDelete(comp.id, e)}
                        title="Delete Company"
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Company Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Company Account"
          description="Record will be tenant-scoped to your active organization."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-[var(--radius-sm)] text-xs text-[var(--danger)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Company Name *</label>
              <input
                type="text"
                required
                placeholder="Acme Innovations, Inc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Web Domain</label>
                <input
                  type="text"
                  placeholder="acme.io"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Industry</label>
                <input
                  type="text"
                  placeholder="SaaS / Cloud"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Annual Revenue ($)</label>
                <input
                  type="number"
                  placeholder="10000000"
                  value={formData.annualRevenue}
                  onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Employees (FTE)</label>
                <input
                  type="number"
                  placeholder="250"
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">City</label>
                <input
                  type="text"
                  placeholder="San Francisco"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">State / Region</label>
                <input
                  type="text"
                  placeholder="CA"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={createLoading}
              >
                Save Company
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
