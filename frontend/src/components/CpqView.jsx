import React, { useState, useEffect } from 'react';
import {
  Receipt,
  ShoppingBag,
  Tag,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  X,
  Building2,
  User,
  Briefcase,
  Layers,
  ShieldCheck,
  Trash2,
  Printer,
  Eye,
  RefreshCw,
  AlertCircle,
  Percent,
  Check,
  FileCheck2,
  Calendar
} from 'lucide-react';
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuoteStatus,
  processQuoteSignature,
  getQuotePdf,
  getProducts,
  createProduct,
  getPriceBooks,
  getPriceBookById,
  createPriceBook,
  addPriceBookEntry,
  getDeals,
  getCompanies,
  getContacts
} from '../services/api';

export default function CpqView() {
  const [activeTab, setActiveTab] = useState('quotes'); // 'quotes' | 'products' | 'pricebooks'
  
  // Data states
  const [quotes, setQuotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [priceBooks, setPriceBooks] = useState([]);
  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  // Modals
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewPriceBookModalOpen, setIsNewPriceBookModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form states: New Product
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'Software',
    pricingType: 'recurring',
    billingFrequency: 'annual',
    unitPrice: '',
    costPrice: '',
    taxRate: '8'
  });

  // Form states: New Quote Builder
  const [quoteForm, setQuoteForm] = useState({
    title: '',
    dealId: '',
    companyId: '',
    contactId: '',
    priceBookId: '',
    discountType: 'fixed',
    discountValue: 0,
    taxRate: 8,
    validDays: 30,
    termsConditions: 'Net-30 payment terms. 99.95% multi-region uptime SLA included.',
    notes: '',
    lineItems: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotesRes, prodsRes, pbsRes, dealsRes, compsRes, contsRes] = await Promise.all([
        getQuotes().catch(() => ({ data: [] })),
        getProducts().catch(() => ({ data: [] })),
        getPriceBooks().catch(() => ({ data: [] })),
        getDeals().catch(() => ({ data: [] })),
        getCompanies().catch(() => ({ data: [] })),
        getContacts().catch(() => ({ data: [] })),
      ]);

      setQuotes(quotesRes.data || []);
      setProducts(prodsRes.data || []);
      setPriceBooks(pbsRes.data || []);
      setDeals(dealsRes.data || []);
      setCompanies(compsRes.data || []);
      setContacts(contsRes.data || []);

      // If pricebooks available, preset standard pricebook in quote form
      const stdPb = (pbsRes.data || []).find(pb => pb.is_standard);
      if (stdPb) {
        setQuoteForm(prev => ({ ...prev, priceBookId: stdPb.id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load CPQ data');
    } finally {
      setLoading(false);
    }
  };

  // Quotes Filtering
  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = !quoteSearch || 
      q.title.toLowerCase().includes(quoteSearch.toLowerCase()) || 
      q.quote_number.toLowerCase().includes(quoteSearch.toLowerCase()) ||
      (q.company_name && q.company_name.toLowerCase().includes(quoteSearch.toLowerCase()));
    const matchesStatus = quoteStatusFilter === 'all' || q.status === quoteStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Products Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = !productSearch || 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Total Metrics
  const totalQuoteValue = quotes.reduce((acc, q) => acc + parseFloat(q.total_amount || 0), 0);
  const signedQuoteCount = quotes.filter(q => q.signature_status === 'signed' || q.status === 'accepted').length;

  // Handle Quote Builder: add line item
  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setQuoteForm(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          productId: defaultProd.id,
          productName: defaultProd.name,
          quantity: 1,
          unitPrice: parseFloat(defaultProd.unit_price || 0),
          discountPercent: 0,
          billingFrequency: defaultProd.billing_frequency || 'annual'
        }
      ]
    }));
  };

  const handleUpdateLineItem = (index, field, value) => {
    setQuoteForm(prev => {
      const items = [...prev.lineItems];
      if (field === 'productId') {
        const prod = products.find(p => p.id === parseInt(value, 10));
        if (prod) {
          items[index] = {
            ...items[index],
            productId: prod.id,
            productName: prod.name,
            unitPrice: parseFloat(prod.unit_price || 0),
            billingFrequency: prod.billing_frequency || 'annual'
          };
        }
      } else {
        items[index] = {
          ...items[index],
          [field]: field === 'quantity' || field === 'unitPrice' || field === 'discountPercent' ? parseFloat(value) || 0 : value
        };
      }
      return { ...prev, lineItems: items };
    });
  };

  const handleRemoveLineItem = (index) => {
    setQuoteForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  // Compute live subtotal & total for quote builder
  const computeQuoteTotals = () => {
    const subtotal = quoteForm.lineItems.reduce((acc, item) => {
      const lineBase = item.quantity * item.unitPrice;
      const discount = lineBase * (item.discountPercent / 100);
      return acc + (lineBase - discount);
    }, 0);

    const discountAmount = quoteForm.discountType === 'percent'
      ? subtotal * (parseFloat(quoteForm.discountValue || 0) / 100)
      : parseFloat(quoteForm.discountValue || 0);

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = afterDiscount * (parseFloat(quoteForm.taxRate || 0) / 100);
    const totalAmount = afterDiscount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  const { subtotal: formSubtotal, discountAmount: formDiscount, taxAmount: formTax, totalAmount: formTotal } = computeQuoteTotals();

  // Create Quote submit
  const handleCreateQuoteSubmit = async (e) => {
    e.preventDefault();
    if (quoteForm.lineItems.length === 0) {
      alert('Please add at least one product line item to generate a quote.');
      return;
    }

    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(quoteForm.validDays || 30, 10));

      const payload = {
        title: quoteForm.title,
        dealId: quoteForm.dealId ? parseInt(quoteForm.dealId, 10) : null,
        companyId: quoteForm.companyId ? parseInt(quoteForm.companyId, 10) : null,
        contactId: quoteForm.contactId ? parseInt(quoteForm.contactId, 10) : null,
        priceBookId: quoteForm.priceBookId ? parseInt(quoteForm.priceBookId, 10) : null,
        discountType: quoteForm.discountType,
        discountValue: parseFloat(quoteForm.discountValue || 0),
        taxRate: parseFloat(quoteForm.taxRate || 0),
        validUntil: validUntil.toISOString().split('T')[0],
        termsConditions: quoteForm.termsConditions,
        notes: quoteForm.notes,
        lineItems: quoteForm.lineItems.map(item => ({
          productId: item.productId,
          description: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          billingFrequency: item.billingFrequency
        }))
      };

      await createQuote(payload);
      setIsNewQuoteModalOpen(false);
      fetchInitialData();
    } catch (err) {
      alert(`Failed to create quote: ${err.response?.data?.message || err.message}`);
    }
  };

  // Create Product submit
  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    try {
      await createProduct({
        ...newProductForm,
        unitPrice: parseFloat(newProductForm.unitPrice || 0),
        costPrice: parseFloat(newProductForm.costPrice || 0),
        taxRate: parseFloat(newProductForm.taxRate || 0)
      });
      setIsNewProductModalOpen(false);
      setNewProductForm({
        name: '',
        sku: '',
        description: '',
        category: 'Software',
        pricingType: 'recurring',
        billingFrequency: 'annual',
        unitPrice: '',
        costPrice: '',
        taxRate: '8'
      });
      fetchInitialData();
    } catch (err) {
      alert(`Failed to create product: ${err.response?.data?.message || err.message}`);
    }
  };

  // Inspect Quote
  const handleInspectQuote = async (id) => {
    try {
      const res = await getQuoteById(id);
      if (res.data) {
        setSelectedQuoteDetail(res.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      alert(`Failed to load quote details: ${err.message}`);
    }
  };

  // Status transition
  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      await updateQuoteStatus(quoteId, { status: newStatus });
      fetchInitialData();
      if (selectedQuoteDetail?.id === quoteId) {
        handleInspectQuote(quoteId);
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Simulate DocuSign E-Signature
  const handleSimulateSign = async (quoteId) => {
    try {
      await processQuoteSignature(quoteId, {
        signerName: selectedQuoteDetail?.contact_name || 'Client Principal Authorized Signer',
        signatureData: 'docusign_jwt_verified_v1'
      });
      alert('✅ Electronic Signature Verified! Quote marked as ACCEPTED & Signed. Audit event posted to activity timeline.');
      fetchInitialData();
      if (selectedQuoteDetail?.id === quoteId) {
        handleInspectQuote(quoteId);
      }
    } catch (err) {
      alert(`Failed to process e-signature: ${err.message}`);
    }
  };

  // View Printable PDF Preview
  const handleOpenPdf = async (quoteId) => {
    try {
      const res = await getQuotePdf(quoteId);
      if (res.data?.html) {
        setPdfHtml(res.data.html);
        setIsPdfModalOpen(true);
      }
    } catch (err) {
      alert(`Failed to render PDF preview: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Metrics Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Products, Pricebooks & CPQ Engine</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                Spec §24, §25
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Multi-currency pricebooks, dynamic discount matrices, quote versioning & verified electronic signatures.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'quotes'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Quotes & Proposals ({quotes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'products'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pricebooks')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pricebooks'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Price Books ({priceBooks.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quoted Value</span>
            <div className="text-xl font-bold text-slate-900 mt-1">${totalQuoteValue.toLocaleString()}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Across all open & closed quotes</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Executed / Signed</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{signedQuoteCount} Quotes</div>
            <span className="text-[11px] text-emerald-600 font-medium">DocuSign verified agreements</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog SKUs</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{products.length} Products</div>
            <span className="text-[11px] text-slate-500 font-medium">Software, Add-ons & Services</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Price Books</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{priceBooks.length} Books</div>
            <span className="text-[11px] text-indigo-600 font-medium">Tier-1 & Standard Corporate</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TAB 1: QUOTES & PROPOSALS */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  placeholder="Search by quote #, title, or client..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <select
                value={quoteStatusFilter}
                onChange={(e) => setQuoteStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="presented">Presented</option>
                <option value="accepted">Accepted / Signed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (quoteForm.lineItems.length === 0 && products.length > 0) {
                  handleAddLineItem();
                }
                setIsNewQuoteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Configure New Quote (CPQ)</span>
            </button>
          </div>

          {/* Quotes Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Proposal Title</th>
                    <th className="py-3 px-4">Client / Company</th>
                    <th className="py-3 px-4">Opportunity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">E-Signature</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No quotes match the selected criteria. Click "Configure New Quote" above.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((q) => {
                      const isSigned = q.signature_status === 'signed' || q.status === 'accepted';
                      const isPendingSig = q.signature_status === 'pending_signature';

                      return (
                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {q.quote_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                            {q.title}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {q.company_name || 'Independent Client'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {q.deal_title || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              q.status === 'approved' || q.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : q.status === 'presented' || q.status === 'in_review'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {q.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isSigned ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Signed</span>
                              </span>
                            ) : isPendingSig ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Awaiting E-Sign</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Unsigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                            ${parseFloat(q.total_amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleInspectQuote(q.id)}
                                title="Inspect Quote & Line Items"
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenPdf(q.id)}
                                title="Print / PDF Invoice Preview"
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-purple-600 transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT CATALOG */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by product name or SKU..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="Software">Software</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            <button
              onClick={() => setIsNewProductModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Catalog Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const margin = p.unit_price > 0 && p.cost_price > 0 
                ? Math.round(((p.unit_price - p.cost_price) / p.unit_price) * 100)
                : null;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {p.sku}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        p.pricing_type === 'recurring'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {p.pricing_type}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {p.description || 'Enterprise catalog component.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Category:</span>
                        <span className="font-medium">{p.category}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Billing:</span>
                        <span className="font-medium capitalize">{p.billing_frequency}</span>
                      </div>
                      {margin !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Gross Margin:</span>
                          <span className="font-semibold text-emerald-600 font-mono">~{margin}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">List Price</span>
                      <div className="text-base font-bold text-slate-900 font-mono">
                        ${parseFloat(p.unit_price).toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {p.currency} / {p.billing_frequency}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PRICE BOOKS */}
      {activeTab === 'pricebooks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {priceBooks.map((pb) => (
            <div key={pb.id} className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{pb.name}</h3>
                    {pb.is_standard && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        STANDARD DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{pb.description}</p>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-700">
                  {pb.currency}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Pricing Matrix & Entries ({pb.entry_count || 0})
                </span>
                <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase border-b border-slate-200 pb-1.5">
                    <span>Product Catalog Item</span>
                    <span>Volume Matrix</span>
                  </div>
                  {products.map((prod) => (
                    <div key={prod.id} className="flex items-center justify-between text-xs py-1">
                      <span className="font-medium text-slate-800">{prod.name}</span>
                      <span className="font-mono font-semibold text-slate-900">
                        ${pb.is_standard ? parseFloat(prod.unit_price).toLocaleString() : (parseFloat(prod.unit_price) * 0.85).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CONFIGURE NEW QUOTE (CPQ BUILDER) */}
      {isNewQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configure Formal Quote (CPQ)</h3>
                <p className="text-xs text-slate-500">Add product line items, adjust discounts, and link opportunities.</p>
              </div>
              <button
                onClick={() => setIsNewQuoteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuoteSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Proposal Title</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.title}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Enterprise Platform Expansion & Support Proposal"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Price Book Matrix</label>
                  <select
                    value={quoteForm.priceBookId}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, priceBookId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {priceBooks.map(pb => (
                      <option key={pb.id} value={pb.id}>
                        {pb.name} ({pb.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Associated Deal</label>
                  <select
                    value={quoteForm.dealId}
                    onChange={(e) => {
                      const selDeal = deals.find(d => d.id === parseInt(e.target.value, 10));
                      setQuoteForm(prev => ({
                        ...prev,
                        dealId: e.target.value,
                        companyId: selDeal?.company_id || prev.companyId,
                        contactId: selDeal?.contact_id || prev.contactId
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Optional Deal --</option>
                    {deals.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title} (${parseFloat(d.value).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Company Account</label>
                  <select
                    value={quoteForm.companyId}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Select Company --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Decision Maker Contact</label>
                  <select
                    value={quoteForm.contactId}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, contactId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- Select Contact --</option>
                    {contacts.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.first_name} {ct.last_name} ({ct.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Configured Products & Line Items</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {quoteForm.lineItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-4">
                        <select
                          value={item.productId}
                          onChange={(e) => handleUpdateLineItem(idx, 'productId', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${parseFloat(p.unit_price).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateLineItem(idx, 'unitPrice', e.target.value)}
                          placeholder="Unit Price"
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs text-right font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => handleUpdateLineItem(idx, 'discountPercent', e.target.value)}
                          placeholder="Disc %"
                          className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs text-center"
                        />
                      </div>

                      <div className="col-span-1 text-right font-bold font-mono text-slate-800">
                        ${((item.quantity * item.unitPrice) * (1 - item.discountPercent / 100)).toLocaleString()}
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Discounts Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Overall Discount Type</label>
                      <select
                        value={quoteForm.discountType}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, discountType: e.target.value }))}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                      >
                        <option value="fixed">Fixed Amount ($)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Discount Value</label>
                      <input
                        type="number"
                        min="0"
                        value={quoteForm.discountValue}
                        onChange={(e) => setQuoteForm(prev => ({ ...prev, discountValue: e.target.value }))}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-64 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">${formSubtotal.toLocaleString()}</span>
                  </div>
                  {formDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">-${formDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax ({quoteForm.taxRate}%):</span>
                    <span className="font-mono font-semibold">${formTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-indigo-700 border-t border-slate-200 pt-1.5">
                    <span>Grand Total:</span>
                    <span className="font-mono">${formTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewQuoteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Generate & Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PRODUCT */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Product to Catalog</h3>
              <button onClick={() => setIsNewProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Multi-Tenant Dedicated Sandbox"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="SKU-SNDBX-01"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Software">Software</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">List Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProductForm.unitPrice}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="12000.00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Billing Cycle</label>
                  <select
                    value={newProductForm.billingFrequency}
                    onChange={(e) => setNewProductForm(prev => ({ ...prev, billingFrequency: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Technical description of this offering..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUOTE DETAIL INSPECTOR & APPROVAL WORKFLOW */}
      {isDetailModalOpen && selectedQuoteDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded border border-indigo-200">
                    {selectedQuoteDetail.quote_number}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{selectedQuoteDetail.title}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Prepared for: <strong>{selectedQuoteDetail.company_name}</strong> · Contact: <strong>{selectedQuoteDetail.contact_name}</strong>
                </p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status and Action Buttons */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Lifecycle Stage</span>
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {selectedQuoteDetail.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">DocuSign State</span>
                    <span className="font-semibold text-xs text-slate-700 capitalize">
                      {selectedQuoteDetail.signature_status}
                    </span>
                  </div>
                </div>

                {/* Workflow Transitions */}
                <div className="flex items-center gap-2">
                  {selectedQuoteDetail.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(selectedQuoteDetail.id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Quote</span>
                    </button>
                  )}

                  {selectedQuoteDetail.status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(selectedQuoteDetail.id, 'presented')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Present to Client</span>
                    </button>
                  )}

                  {selectedQuoteDetail.signature_status !== 'signed' && (
                    <button
                      onClick={() => handleSimulateSign(selectedQuoteDetail.id)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Execute DocuSign E-Sign</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenPdf(selectedQuoteDetail.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Billing</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Disc</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(selectedQuoteDetail.lineItems || []).map((li, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {li.product_name}
                          <span className="block font-mono text-[10px] text-slate-400">{li.sku}</span>
                        </td>
                        <td className="py-2.5 px-3 capitalize">{li.billing_frequency}</td>
                        <td className="py-2.5 px-3">{parseFloat(li.quantity).toFixed(0)}</td>
                        <td className="py-2.5 px-3 font-mono">${parseFloat(li.unit_price).toLocaleString()}</td>
                        <td className="py-2.5 px-3">{parseFloat(li.discount_percent) > 0 ? `${li.discount_percent}%` : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ${parseFloat(li.line_total).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial summary */}
              <div className="flex justify-end">
                <div className="w-72 space-y-1.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">${parseFloat(selectedQuoteDetail.subtotal).toLocaleString()}</span>
                  </div>
                  {parseFloat(selectedQuoteDetail.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount Applied:</span>
                      <span className="font-mono">-${parseFloat(selectedQuoteDetail.discount_amount).toLocaleString()}</span>
                    </div>
                  )}
                  {parseFloat(selectedQuoteDetail.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({selectedQuoteDetail.tax_rate}%):</span>
                      <span className="font-mono font-semibold">${parseFloat(selectedQuoteDetail.tax_amount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-indigo-700 border-t border-slate-200 pt-1.5">
                    <span>Contract Total:</span>
                    <span className="font-mono">${parseFloat(selectedQuoteDetail.total_amount).toLocaleString()} {selectedQuoteDetail.currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE PDF PREVIEW */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Printable PDF Quote Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-slate-100 overflow-y-auto flex justify-center">
              <iframe
                title="Quote PDF Preview"
                srcDoc={pdfHtml}
                className="w-full max-w-3xl h-full bg-white shadow-md rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
