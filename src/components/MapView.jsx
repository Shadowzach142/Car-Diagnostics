import React, { useState, useEffect, useRef } from 'react';
import { useFleet } from '../context/FleetContext';
import { getVehicleImage } from '../data/fleetData';
import {
  RotateCcw,
  FileText,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = { ACTIVE: '#16A34A', 'IN-SHOP': '#D97706', OFFLINE: '#DC2626' };

const TILE_PROVIDERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
  }
};

export const MapView = () => {
  const { vehicles, branches, setSelectedVehicle, setModalType } = useFleet();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activePin, setActivePin] = useState(null);
  const [activeLayer, setActiveLayer] = useState('osm'); // 'osm' | 'satellite'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  const filtered = vehicles.filter(v =>
    (branchFilter === 'ALL' || v.branchId === branchFilter) &&
    (statusFilter === 'ALL' || v.status === statusFilter)
  );

  const branchName = (id) => branches.find(b => b.id === id)?.name || id;

  const reset = () => {
    setBranchFilter('ALL');
    setStatusFilter('ALL');
    setActivePin(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([7.06, 124.88], 10, { duration: 1 });
    }
  };

  const openModal = (modal) => {
    setSelectedVehicle(activePin);
    setModalType(modal);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Cotabato Province (Kidapawan-Midsayap-Kabacan corridor)
    const map = L.map(mapContainerRef.current, {
      center: [7.06, 124.88],
      zoom: 10,
      zoomControl: false,
      attributionControl: true
    });

    // Add Tile Layer
    const provider = TILE_PROVIDERS[activeLayer] || TILE_PROVIDERS.osm;
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      subdomains: provider.subdomains,
      maxZoom: 19
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Feature group for markers
    const markersGroup = L.featureGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Layer change
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const provider = TILE_PROVIDERS[activeLayer] || TILE_PROVIDERS.osm;
    tileLayerRef.current.setUrl(provider.url);
  }, [activeLayer]);

  // Handle Branch Filter Zoom
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (branchFilter !== 'ALL') {
      const b = branches.find(item => item.id === branchFilter);
      if (b && b.coordinates) {
        mapInstanceRef.current.flyTo([b.coordinates.lat, b.coordinates.lng], 13, { duration: 1.2 });
      }
    }
  }, [branchFilter, branches]);

  // Render Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const group = markersLayerRef.current;
    group.clearLayers();

    // 1. Add Branch Office Markers
    branches.forEach(b => {
      if (!b.coordinates) return;
      const count = vehicles.filter(v => v.branchId === b.id).length;
      const isDim = branchFilter !== 'ALL' && branchFilter !== b.id;

      const html = `
        <div class="branch-pin ${isDim ? 'dimmed' : ''}">
          <div class="branch-circle ${b.isHQ ? 'is-hq' : ''}">
            ${b.isHQ ? 'HQ' : count}
          </div>
          <div class="branch-label">
            ${b.municipality.replace(' District', '').replace(' Sector', '')}
          </div>
        </div>
      `;

      const branchIcon = L.divIcon({
        className: 'branch-marker-icon',
        html,
        iconSize: [80, 54],
        iconAnchor: [40, 24]
      });

      const marker = L.marker([b.coordinates.lat, b.coordinates.lng], {
        icon: branchIcon,
        zIndexOffset: 100
      });

      marker.on('click', () => {
        setBranchFilter(b.id);
      });

      marker.addTo(group);
    });

    // 2. Add Vehicle Markers
    filtered.forEach(v => {
      if (!v.coordinates) return;
      const color = COLORS[v.status] || '#16A34A';
      const isSelected = activePin?.id === v.id;

      const html = `
        <div class="vehicle-pin ${isSelected ? 'selected' : ''}">
          <div class="vehicle-dot" style="background-color: ${color};"></div>
          ${isSelected ? `<div class="vehicle-tag">${v.code}</div>` : ''}
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'vehicle-marker-icon',
        html,
        iconSize: [60, 40],
        iconAnchor: [30, 9]
      });

      const marker = L.marker([v.coordinates.lat, v.coordinates.lng], {
        icon: vehicleIcon,
        zIndexOffset: isSelected ? 500 : 200
      });

      const popupHtml = `
        <div class="map-popup-content">
          <div class="map-popup-title">${v.code} · ${v.plateNo}</div>
          <div class="map-popup-sub">${v.makeModel}</div>
          <button type="button" class="map-popup-btn" id="pop-inspect-${v.id}">Inspect Vehicle</button>
        </div>
      `;

      marker.bindPopup(popupHtml, { offset: [0, -10] });

      marker.on('click', () => {
        setActivePin(v);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([v.coordinates.lat, v.coordinates.lng]);
        }
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`pop-inspect-${v.id}`);
        if (btn) {
          btn.onclick = () => {
            setSelectedVehicle(v);
            setModalType('vehicle-detail');
          };
        }
      });

      marker.addTo(group);
    });
  }, [branches, filtered, activePin, branchFilter]);

  const fitAll = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const bounds = markersLayerRef.current.getBounds();
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  return (
    <div className="page">
      {/* Top Filter & Map Controls Toolbar */}
      <div className="page-toolbar">
        <select
          className="form-select toolbar-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          aria-label="Filter by branch"
        >
          <option value="ALL">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.municipality}</option>)}
        </select>

        <select
          className="form-select toolbar-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="IN-SHOP">In-Shop</option>
          <option value="OFFLINE">Offline</option>
        </select>

        {(branchFilter !== 'ALL' || statusFilter !== 'ALL' || activePin) && (
          <button type="button" className="btn btn-sm btn-outline" onClick={reset}>
            <RotateCcw size={14} /> Reset
          </button>
        )}

        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={fitAll}
          title="Fit all vehicles into view"
        >
          <Maximize2 size={14} /> Fit All
        </button>

        <span className="spacer" />

        {/* Map Tile Layer Switcher */}
        <div className="segmented" role="group" aria-label="Map Tile Provider">
          <button
            type="button"
            className={activeLayer === 'osm' ? 'active' : ''}
            onClick={() => setActiveLayer('osm')}
            title="OpenStreetMap Standard Street View"
          >
            Street (OSM)
          </button>
          <button
            type="button"
            className={activeLayer === 'satellite' ? 'active' : ''}
            onClick={() => setActiveLayer('satellite')}
            title="Real Satellite Aerial View (Esri)"
          >
            Satellite
          </button>
        </div>

        <span className="card-sub">{filtered.length} vehicles mapped</span>
      </div>

      <div className="map-layout">
        {/* Real Leaflet Map Container */}
        <div className="card map-card" style={{ position: 'relative' }}>
          <div
            ref={mapContainerRef}
            className="leaflet-map-element"
            style={{ width: '100%', height: '100%', minHeight: '520px', borderRadius: 'var(--radius-md)' }}
          />

          {/* Map Zoom Floating Controls */}
          <div className="map-floating-controls">
            <button
              type="button"
              className="map-zoom-btn"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="map-zoom-btn"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
          </div>

          {/* Floating Legend */}
          <div className="map-legend">
            <span><i style={{ background: '#1F2937', border: '2px solid #D4ED31' }} />Branch office</span>
            <span><i style={{ background: COLORS.ACTIVE }} />Active ({vehicles.filter(v => v.status === 'ACTIVE').length})</span>
            <span><i style={{ background: COLORS['IN-SHOP'] }} />In-Shop ({vehicles.filter(v => v.status === 'IN-SHOP').length})</span>
            <span><i style={{ background: COLORS.OFFLINE }} />Offline ({vehicles.filter(v => v.status === 'OFFLINE').length})</span>
          </div>
        </div>

        {/* Side Inspector Drawer */}
        <aside className="card inspector" aria-live="polite">
          {activePin ? (
            <>
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                height: '130px',
                marginBottom: '0.75rem',
                border: '1px solid var(--border-subtle)'
              }}>
                <img
                  src={getVehicleImage(activePin)}
                  alt={activePin.code}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  className={`badge ${activePin.status === 'ACTIVE' ? 'badge-success' : activePin.status === 'IN-SHOP' ? 'badge-warning' : 'badge-danger'}`}
                  style={{ position: 'absolute', top: '8px', right: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                >
                  {activePin.status}
                </span>
              </div>

              <div style={{ marginBottom: '0.65rem' }}>
                <div className="vehicle-cell">
                  <span className="vehicle-cell-title" style={{ fontSize: '1.05rem' }}>{activePin.code} · {activePin.plateNo}</span>
                  <span className="vehicle-cell-sub">{activePin.makeModel}</span>
                </div>
              </div>

              <dl className="inspector-facts">
                <div><dt>Assigned branch</dt><dd>{branchName(activePin.branchId)}</dd></div>
                <div><dt>Ownership</dt><dd>COTELCO Company Fleet</dd></div>
                <div><dt>Date Bought</dt><dd>{activePin.acquisitionDate || `${activePin.year}`}</dd></div>
                <div><dt>Odometer</dt><dd className="mono">{activePin.odometerKm.toLocaleString()} km</dd></div>
                <div>
                  <dt>GPS Coordinates</dt>
                  <dd className="mono" style={{ fontSize: '0.8rem' }}>
                    {activePin.coordinates.lat.toFixed(4)}° N, {activePin.coordinates.lng.toFixed(4)}° E
                  </dd>
                </div>
                <div>
                  <dt>Status Note</dt>
                  <dd style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {activePin.statusReason ? (
                      activePin.statusReason.length > 55
                        ? `${activePin.statusReason.substring(0, 52)}...`
                        : activePin.statusReason
                    ) : 'Operational'}
                  </dd>
                </div>
              </dl>

              {activePin.urgentAlert && (
                <div className="inline-alert" style={{ marginTop: '0.4rem', marginBottom: '0.8rem' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '0.8rem' }}>{activePin.urgentAlert}</span>
                </div>
              )}

              <div className="inspector-actions" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', fontWeight: 700 }}
                  onClick={() => {
                    setSelectedVehicle(activePin);
                    setModalType('vehicle-detail');
                  }}
                >
                  <Eye size={15} /> Inspect Dossier
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                  onClick={() => openModal('reassign')}
                >
                  <RefreshCw size={15} /> Reassign Branch
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={34} color="#9CA3AF" />
              <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem', marginTop: '0.5rem' }}>Select a map pin to view telemetry.</strong>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
