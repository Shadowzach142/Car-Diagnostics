import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { X, FileText, Upload, ScanText, Trash2 } from 'lucide-react';

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);
const ALLOWED_ATTACHMENT_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AddLedgerModal = () => {
  const {
    settings,
    modalType,
    setModalType,
    vehicles = [],
    drivers = [],
    workOrders = [],
    selectedVehicle,
    addLedgerEntry
  } = useFleet();

  const isMechanic = settings?.currentRole === 'MECHANIC';
  const mechName = (settings?.currentMechanic || '').split(' (')[0].trim();
  const mechNameNorm = mechName.toLowerCase();

  const availableVehicles = useMemo(() => {
    if (!isMechanic) return vehicles;
    const matchedDriver = drivers.find(
      (d) => (d.name || '').trim().toLowerCase() === mechNameNorm
    );
    if (matchedDriver) {
      return vehicles.filter((v) =>
        (v.authorizedDriverIds || []).includes(matchedDriver.id)
      );
    }
    const orderCodes = new Set(
      workOrders
        .filter(
          (wo) =>
            (wo.assignedMechanic || '').split(' (')[0].trim().toLowerCase() ===
            mechNameNorm
        )
        .map((wo) => wo.vehicleCode)
    );
    return vehicles.filter((v) => orderCodes.has(v.code));
  }, [isMechanic, vehicles, drivers, workOrders, mechNameNorm]);

  const [vehicleCode, setVehicleCode] = useState('');
  const [repairScope, setRepairScope] = useState('OUTSIDE');
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [facility, setFacility] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [serviceSummary, setServiceSummary] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [fileError, setFileError] = useState('');
  const receiptInputRef = useRef(null);

  useEffect(() => {
    if (selectedVehicle && availableVehicles.some((v) => v.code === selectedVehicle.code)) {
      setVehicleCode(selectedVehicle.code);
    } else if (availableVehicles.length > 0 && !availableVehicles.some((v) => v.code === vehicleCode)) {
      setVehicleCode(availableVehicles[0].code);
    }
  }, [selectedVehicle, availableVehicles, vehicleCode]);

  useEffect(() => {
    if (modalType === 'add-ledger' && isMechanic) {
      setMechanic(mechName);
    }
  }, [modalType, isMechanic, mechName]);

  if (modalType !== 'add-ledger') return null;

  const handleFilePicked = (file) => {
    if (!file) return;
    setOcrStatus('');
    const fileNameLower = String(file.name || '').toLowerCase();
    const dotIdx = fileNameLower.lastIndexOf('.');
    const ext = dotIdx >= 0 ? fileNameLower.slice(dotIdx) : '';
    const mime = String(file.type || '').toLowerCase();

    if (!ALLOWED_ATTACHMENT_EXTS.has(ext) || !ALLOWED_ATTACHMENT_MIMES.has(mime)) {
      setFileError('Invalid file type. Allowed: .jpg, .jpeg, .png, .webp, or .pdf.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFileError('File exceeds 2 MB limit. Please choose a file under 2 MB.');
      return;
    }

    setFileError('');
    const isImage = mime.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;

      const baseTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      if (!serviceType.trim()) setServiceType(baseTitle);

      if (isImage) {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1000;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          const finalUrl = ctx
            ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height),
              canvas.toDataURL('image/jpeg', 0.85))
            : dataUrl;
          setReceiptImage(finalUrl);
          setAttachedFile({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileDataUrl: finalUrl,
            isImage: true
          });
        };
        img.onerror = () => {
          setReceiptImage(dataUrl);
          setAttachedFile({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileDataUrl: dataUrl,
            isImage: true
          });
        };
        img.src = dataUrl;
      } else {
        setReceiptImage(null);
        setAttachedFile({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          fileDataUrl: dataUrl,
          isImage: false
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFilePicked(file);
    e.target.value = '';
  };

  const handleRunOcr = async () => {
    if (!receiptImage) return;
    if (typeof window !== 'undefined' && 'TextDetector' in window) {
      try {
        setOcrStatus('Scanning document text...');
        const img = new Image();
        img.src = receiptImage;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const detector = new window.TextDetector();
        const blocks = await detector.detect(img);
        const fullText = blocks.map((b) => b.rawValue).join('\n');
        if (!fullText.trim()) {
          setOcrStatus('No readable text detected — photo is still attached.');
          return;
        }
        const dateMatch = fullText.match(/\b(20\d{2}[-/]\d{2}[-/]\d{2})\b/);
        if (dateMatch) setDate(dateMatch[1].replace(/\//g, '-'));
        setServiceSummary((prev) => (prev ? prev : fullText.slice(0, 300)));
        setOcrStatus('OCR extracted text from photo.');
      } catch {
        setOcrStatus('Photo attached for report.');
      }
    } else {
      setOcrStatus('Photo attached for report.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serviceType.trim() || !vehicleCode) return;

    const defaultFacility = isMechanic
      ? 'Field / Driver Submission'
      : repairScope === 'OUTSIDE'
      ? 'Authorized Outside Service Shop'
      : 'Central Motorpool & Testing Facility';

    const ok = addLedgerEntry({
      vehicleCode,
      repairScope: isMechanic ? 'OUTSIDE' : repairScope,
      receiptImage,
      fileName: attachedFile?.fileName || null,
      fileType: attachedFile?.fileType || null,
      fileSize: attachedFile?.fileSize || null,
      fileDataUrl: attachedFile?.fileDataUrl || null,
      serviceType: serviceType.trim(),
      date,
      partsCost: 0,
      laborCost: 0,
      facility: facility.trim() || defaultFacility,
      mechanic:
        (isMechanic ? mechName : mechanic.trim()) ||
        (repairScope === 'OUTSIDE' ? 'Outside Shop Technician' : 'Senior Motorpool Mechanic'),
      serviceSummary: serviceSummary.trim() || serviceType.trim()
    });

    if (ok) {
      setServiceType('');
      setFacility('');
      if (!isMechanic) setMechanic('');
      setServiceSummary('');
      setReceiptImage(null);
      setAttachedFile(null);
      setOcrStatus('');
      setFileError('');
      setModalType(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setModalType(null)}>
      <div className="modal-box" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-box-header">
          <div className="modal-box-title">
            <FileText size={19} color="var(--primary)" />
            <span>Add Report</span>
          </div>
          <button
            type="button"
            className="modal-box-close"
            onClick={() => setModalType(null)}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Vehicle Picker (Scoped to Authorized Vehicle(s) for Mechanic) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Vehicle *</label>
              <select
                className="form-select"
                value={vehicleCode}
                onChange={(e) => setVehicleCode(e.target.value)}
                required
              >
                {availableVehicles.length === 0 ? (
                  <option value="">No authorized vehicles available</option>
                ) : (
                  availableVehicles.map((v) => (
                    <option key={v.id} value={v.code}>
                      {v.code} &bull; {v.plateNo} ({v.makeModel})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Drag & Drop Report File or Photo */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Attach Report File or Photo (Optional)</label>
              <input
                ref={receiptInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleReceiptPhotoChange}
                style={{ display: 'none' }}
              />
              {!attachedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer?.files?.[0];
                    if (file) handleFilePicked(file);
                  }}
                  onClick={() => receiptInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem',
                    borderRadius: '8px',
                    border: fileError ? '1.5px dashed #DC2626' : isDragging ? '1.5px dashed #84CC16' : '1px dashed var(--border-medium)',
                    background: isDragging ? '#F7FDE8' : 'var(--bg-surface-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.2rem',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    <Upload size={15} /> Drag &amp; drop a file here, or click to browse
                  </div>
                  <div style={{ fontSize: '0.73rem', color: fileError ? 'var(--bad-text)' : 'var(--text-muted)', fontWeight: fileError ? 600 : 400 }}>
                    {fileError || 'PDF (.pdf) or photo (.jpg, .jpeg, .png, .webp) · Max 2 MB'}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    background: 'var(--bg-surface-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    {receiptImage ? (
                      <img
                        src={receiptImage}
                        alt="Attached report"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          background: '#fff',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={18} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {attachedFile.fileName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {ocrStatus || formatFileSize(attachedFile.fileSize)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    {receiptImage && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={handleRunOcr}
                        title="Extract text or date from photo"
                      >
                        <ScanText size={13} /> OCR
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setReceiptImage(null);
                        setAttachedFile(null);
                        setOcrStatus('');
                      }}
                      title="Remove attachment"
                      style={{ color: '#DC2626', borderColor: '#FECACA' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Title + Date */}
            <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Report Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tire Check / Incident Report"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Director-only Facility / Source fields */}
            {!isMechanic && (
              <div className="responsive-grid-2" style={{ gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Source</label>
                  <select
                    className="form-select"
                    value={repairScope}
                    onChange={(e) => setRepairScope(e.target.value)}
                  >
                    <option value="OUTSIDE">Outside Repair Shop</option>
                    <option value="IN_HOUSE">In-House Motorpool</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Submitted By</label>
                  <input
                    type="text"
                    className="form-input"
                    value={mechanic}
                    onChange={(e) => setMechanic(e.target.value)}
                    placeholder="Driver or technician name"
                  />
                </div>
              </div>
            )}

            {!isMechanic && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Facility / Shop</label>
                <input
                  type="text"
                  className="form-input"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder={repairScope === 'OUTSIDE' ? 'Outside repair shop name' : 'Central Motorpool'}
                />
              </div>
            )}

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Write details or summary of the report..."
                value={serviceSummary}
                onChange={(e) => setServiceSummary(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-box-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setModalType(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!vehicleCode}>
              Save Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
