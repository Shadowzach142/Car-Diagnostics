import React, { useState, useMemo, useEffect } from 'react';
import { formatVehicleShort, VEHICLE_GROUPS } from '../../utils/formatters';

export const VehicleSelect = ({
  vehicles = [],
  value,
  onChange,
  valueKey = 'code', // 'code' or 'id'
  label = 'Select Vehicle: *',
  required = true,
  showFilterPills = true,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Find currently selected vehicle object
  const currentVehicle = useMemo(() => {
    return vehicles.find(v => String(v[valueKey]) === String(value));
  }, [vehicles, value, valueKey]);

  // Synchronize category if vehicle was preselected from parent
  useEffect(() => {
    if (currentVehicle && selectedCategory !== 'ALL' && currentVehicle.classification !== selectedCategory) {
      // Keep category filter in sync if user selected a vehicle from outside
      setSelectedCategory('ALL');
    }
  }, [currentVehicle]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { ALL: vehicles.length };
    VEHICLE_GROUPS.forEach(g => {
      counts[g.key] = vehicles.filter(v => v.classification === g.key).length;
    });
    return counts;
  }, [vehicles]);

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    if (selectedCategory === 'ALL') return vehicles;
    return vehicles.filter(v => v.classification === selectedCategory);
  }, [vehicles, selectedCategory]);

  const handleCategoryClick = (categoryKey) => {
    setSelectedCategory(categoryKey);
    const targetList = categoryKey === 'ALL'
      ? vehicles
      : vehicles.filter(v => v.classification === categoryKey);

    // If current vehicle is not in target list, select first from target list
    if (targetList.length > 0 && (!currentVehicle || (categoryKey !== 'ALL' && currentVehicle.classification !== categoryKey))) {
      const nextVeh = targetList[0];
      onChange(nextVeh[valueKey], nextVeh);
    }
  };

  const handleSelectChange = (e) => {
    const nextVal = e.target.value;
    const nextVeh = vehicles.find(v => String(v[valueKey]) === String(nextVal));
    onChange(nextVal, nextVeh);
  };

  return (
    <div className={`form-group vehicle-select-group ${className}`} style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {filteredVehicles.length} of {vehicles.length} available
        </span>
      </div>

      {showFilterPills && (
        <div
          className="vehicle-category-pills"
          style={{
            display: 'flex',
            gap: '0.3rem',
            overflowX: 'auto',
            paddingBottom: '0.4rem',
            marginBottom: '0.35rem',
            scrollbarWidth: 'none'
          }}
          role="group"
          aria-label="Filter vehicle category"
        >
          <button
            type="button"
            className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-dark' : 'btn-outline'}`}
            style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', minHeight: '26px', whiteSpace: 'nowrap' }}
            onClick={() => handleCategoryClick('ALL')}
          >
            All ({categoryCounts.ALL})
          </button>
          {VEHICLE_GROUPS.map(g => {
            const count = categoryCounts[g.key] || 0;
            if (count === 0) return null;
            const shortLabel =
              g.key === 'Pickup' ? 'Pickups' :
              g.key === 'Bucket Truck' ? 'Boom Trucks' :
              g.key === 'Truck' ? 'Heavy Trucks' :
              g.key === 'Van' ? 'Vans' :
              g.key === 'Motorcycle' ? 'Motorcycles' : g.label;

            return (
              <button
                type="button"
                key={g.key}
                className={`btn btn-sm ${selectedCategory === g.key ? 'btn-dark' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', minHeight: '26px', whiteSpace: 'nowrap' }}
                onClick={() => handleCategoryClick(g.key)}
              >
                {shortLabel} ({count})
              </button>
            );
          })}
        </div>
      )}

      <select
        className="form-select"
        value={value}
        onChange={handleSelectChange}
        required={required}
        aria-label="Select vehicle"
      >
        {selectedCategory === 'ALL' ? (
          // Grouped optgroups when viewing all vehicles
          VEHICLE_GROUPS.map(g => {
            const groupVehicles = vehicles.filter(v => v.classification === g.key);
            if (groupVehicles.length === 0) return null;
            return (
              <optgroup key={g.key} label={`${g.label} (${groupVehicles.length})`}>
                {groupVehicles.map(v => (
                  <option key={v.id} value={v[valueKey]}>
                    {formatVehicleShort(v)}
                  </option>
                ))}
              </optgroup>
            );
          })
        ) : (
          // Filtered short list when a category is selected
          filteredVehicles.map(v => (
            <option key={v.id} value={v[valueKey]}>
              {formatVehicleShort(v)}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

