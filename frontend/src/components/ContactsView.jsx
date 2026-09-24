import React, { useState, useEffect } from 'react';
import { getContacts, createContact, deleteContact, getCompanies } from '../services/api';
import ContactDetailModal from './ContactDetailModal';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Eye, 
  Building2, 
  Mail, 
  Phone, 
  RefreshCw, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { Button, Card, Badge, Modal, Input } from './ui';

export default function ContactsView() {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [activeContactId, setActiveContactId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // New Contact Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: '',
    lifecycleStage: 'lead',
    leadStatus: 'new',
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedStage) params.stage = selectedStage;
      const res = await getContacts(params);
      if (res.success) {
        setContacts(res.data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await getCompanies({ limit: 100 });
      if (res.success) {
        setCompanies(res.data.companies || []);
      }
    } catch (e) {
      console.error('Failed to load companies for dropdown:', e);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, [search, selectedStage]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this contact record?')) return;
    try {
      await deleteContact(id);
      await fetchContacts();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await createContact({
        ...formData,
        companyId: formData.companyId ? Number(formData.companyId) : null,
      });
      if (res.success) {
        setIsCreateOpen(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          jobTitle: '',
          companyId: '',
          lifecycleStage: 'lead',
          leadStatus: 'new',
        });
        await fetchContacts();
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Error creating contact');
    } finally {
      setCreateLoading(false);
    }
  };

  const getStageVariant = (stage) => {
    switch (stage) {
      case 'customer':
      case 'evangelist':
        return 'success';
      case 'opportunity':
      case 'sales_qualified_lead':
        return 'warning';
      case 'lead':
      case 'marketing_qualified_lead':
        return 'info';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header (§7.1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Contacts</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Manage stakeholders, leads, and customer accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchContacts}
            disabled={loading}
            className="p-2 text-[var(--text-secondary)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            title="Refresh Contacts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            icon={Plus}
          >
            New Contact
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar (§7.1) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="h-8 px-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)] cursor-pointer"
          >
            <option value="">All Lifecycle Stages</option>
            <option value="subscriber">Subscriber</option>
            <option value="lead">Lead</option>
            <option value="marketing_qualified_lead">MQL</option>
            <option value="sales_qualified_lead">SQL</option>
            <option value="opportunity">Opportunity</option>
            <option value="customer">Customer</option>
            <option value="evangelist">Evangelist</option>
          </select>

          <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
            {contacts.length} records
          </span>
        </div>
      </div>

      {/* Table Container (§6.4) */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface-raised)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="h-10 bg-[var(--bg-app)] border-b border-[var(--border-default)] text-[var(--text-secondary)] font-medium">
                <th className="py-2.5 px-4 font-medium">Contact</th>
                <th className="py-2.5 px-4 font-medium">Company</th>
                <th className="py-2.5 px-4 font-medium">Phone</th>
                <th className="py-2.5 px-4 font-medium">Lifecycle Stage</th>
                <th className="py-2.5 px-4 font-medium">Lead Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading && contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[var(--text-tertiary)]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--text-tertiary)]" />
                    <span>Loading contact records...</span>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[var(--text-tertiary)]">
                    No contacts matching search criteria.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setActiveContactId(contact.id)}
                    className="h-10 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center font-medium text-xs shrink-0">
                          {contact.first_name[0]}{contact.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)] hover:underline">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">{contact.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                      {contact.company_name ? (
                        <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
                          <Building2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span>{contact.company_name}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono text-[11px]">
                      {contact.phone || '—'}
                    </td>

                    <td className="py-2.5 px-4">
                      <Badge variant={getStageVariant(contact.lifecycle_stage)}>
                        {contact.lifecycle_stage.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-4 capitalize text-[var(--text-secondary)]">
                      {contact.lead_status.replace(/_/g, ' ')}
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveContactId(contact.id);
                          }}
                          title="View Details"
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(contact.id, e)}
                          title="Delete Contact"
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Details & Timeline Modal */}
      {activeContactId && (
        <ContactDetailModal
          contactId={activeContactId}
          onClose={() => setActiveContactId(null)}
          onUpdated={fetchContacts}
        />
      )}

      {/* Create Contact Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Create New Contact"
          description="Record will be tenant-scoped to your active organization."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger)]/30 rounded-[var(--radius-sm)] text-xs text-[var(--danger)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Cooper"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="jane.cooper@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="VP of Engineering"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Associated Company</label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
              >
                <option value="">No Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Lifecycle Stage</label>
                <select
                  value={formData.lifecycleStage}
                  onChange={(e) => setFormData({ ...formData, lifecycleStage: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                >
                  <option value="subscriber">Subscriber</option>
                  <option value="lead">Lead</option>
                  <option value="marketing_qualified_lead">MQL</option>
                  <option value="sales_qualified_lead">SQL</option>
                  <option value="opportunity">Opportunity</option>
                  <option value="customer">Customer</option>
                  <option value="evangelist">Evangelist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Lead Status</label>
                <select
                  value={formData.leadStatus}
                  onChange={(e) => setFormData({ ...formData, leadStatus: e.target.value })}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-focus)]"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified</option>
                </select>
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
                Save Contact
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
