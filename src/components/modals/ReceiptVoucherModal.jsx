import React from 'react';
import { useFleet } from '../../context/FleetContext';
import { X, Printer, Receipt, FileText, CheckCircle2 } from 'lucide-react';

export const ReceiptVoucherModal = () => {
  const {
    modalType,
    setModalType,
    activeReceipt
  } = useFleet();

  if (modalType !== 'receipt-voucher' || !activeReceipt) return null;

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <Receipt size={20} color="#FBBF24" />
            <span>Official Fleet Service &amp; Repair Expense Voucher</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-box-body">
          <div className="voucher-card">
            {/* Voucher Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2.5px solid var(--color-primary-900)',
              paddingBottom: '1.25rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-primary-900)' }}>
                  CENTRAL MOTORPOOL &amp; TESTING FACILITY
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Regional Utility Fleet Operations &bull; Hotline: (064) 577-1234
                </p>
                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F2744', marginTop: '0.2rem' }}>
                  OFFICIAL FLEET PREVENTIVE MAINTENANCE &amp; REPAIR EXPENSE VOUCHER
                </p>
              </div>

              <div style={{
                textAlign: 'right',
                border: '1.5px solid var(--color-primary-900)',
                padding: '0.5rem 0.9rem',
                borderRadius: '6px',
                background: '#F8FAFC'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>VOUCHER NUMBER</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-primary-900)' }}>
                  {activeReceipt.voucherNo}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 'bold' }}>[AUDITED &amp; ARCHIVED]</div>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="responsive-grid-2" style={{
              gap: '1rem',
              background: '#F8FAFC',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              <div>
                <p><strong>Service Dispatch Ref:</strong> {activeReceipt.workOrderNo}</p>
                <p><strong>Date Cleared:</strong> {activeReceipt.date}</p>
                <p><strong>Assigned Branch:</strong> {activeReceipt.branch}</p>
                <p><strong>Service Facility:</strong> {activeReceipt.facility}</p>
              </div>
              <div>
                <p><strong>Vehicle Asset:</strong> {activeReceipt.vehicleCode}</p>
                <p><strong>LTO Plate Number:</strong> {activeReceipt.plateNo}</p>
                <p><strong>Vehicle Model:</strong> {activeReceipt.model}</p>
                <p><strong>Classification:</strong> {activeReceipt.serviceType}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary-900)', marginBottom: '0.65rem' }}>
                ITEMIZED PARTS, CONSUMABLES &amp; SPECIALIZED LABOR
              </h4>
              <table className="data-table" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th>Description / Part Name</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price (₱)</th>
                    <th style={{ textAlign: 'right' }}>Amount (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReceipt.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.desc}</td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right' }}>₱{(Number(item.unitPrice) || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}><strong>₱{(Number(item.amount) || 0).toLocaleString()}</strong></td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F8FAFC' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Subtotal Parts:</td>
                    <td style={{ textAlign: 'right' }}><strong>₱{(activeReceipt.partsCost || 0).toLocaleString()}</strong></td>
                  </tr>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Specialized Labor:</td>
                    <td style={{ textAlign: 'right' }}><strong>₱{(activeReceipt.laborCost || 0).toLocaleString()}</strong></td>
                  </tr>
                  <tr style={{ background: 'var(--color-primary-900)', color: '#FFFFFF' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontSize: '1.05rem', fontWeight: 900, color: '#FFFFFF' }}>
                      TOTAL EXPENSE VOUCHER (PHP):
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '1.25rem', fontWeight: 900, color: '#FDE68A' }}>
                      ₱{(activeReceipt.totalCost || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Work Summary */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              padding: '0.85rem',
              borderRadius: '6px',
              fontSize: '0.88rem',
              marginBottom: '1.75rem'
            }}>
              <strong>Service Summary &amp; Certification:</strong> {activeReceipt.serviceSummary}
            </div>

            {/* Attached Receipt / Official Invoice Photo */}
            {activeReceipt.receiptImage && (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                padding: '0.85rem',
                borderRadius: '6px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Attached Receipt / Official Invoice Photo
                </div>
                <img
                  src={activeReceipt.receiptImage}
                  alt={`Receipt for ${activeReceipt.voucherNo}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '280px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
            )}

            {/* Signatures */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1.5px dashed #CBD5E1',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ height: '35px', borderBottom: '1.5px solid #334155', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{activeReceipt.mechanic}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Certified Master Mechanic</div>
              </div>
              <div>
                <div style={{ height: '35px', borderBottom: '1.5px solid #334155', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{activeReceipt.driverReceiptSign}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Lineman Crew Custodian</div>
              </div>
              <div>
                <div style={{ height: '35px', borderBottom: '1.5px solid #334155', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{activeReceipt.approvedBy}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Fleet Operations Director</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-box-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setModalType(null)}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print Official Voucher
          </button>
        </div>
      </div>
    </div>
  );
};
