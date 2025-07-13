import React, { useEffect, useState } from 'react';
import { Select, Spin, Input, Button } from 'antd';
import { listReleases, createNewRelease, ReleaseInfo, ResourceType } from '../apiService';

interface ReleaseSelectProps {
  value?: string;
  onChange?: (val: string | undefined) => void;
  label?: string;
  resourceName?: string;
  environment?: string;
  resourceType?: ResourceType;
  style?: React.CSSProperties;
  onReleaseAdded?: (release: string) => void;
  placement?: 'bottomLeft' | 'topLeft';
}

export const ReleaseSelect: React.FC<ReleaseSelectProps> = ({
  value,
  onChange,
  label = 'Release',
  resourceName = '_webapp',
  environment = 'QA',
  resourceType = ResourceType.WEBAPP_RESOURCE,
  style,
  onReleaseAdded,
  placement = 'bottomLeft',
}) => {
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<string | undefined>(value);
  const [releaseLoading, setReleaseLoading] = useState(true);
  const [showAddRelease, setShowAddRelease] = useState(false);
  const [newReleaseName, setNewReleaseName] = useState('');
  const [addReleaseLoading, setAddReleaseLoading] = useState(false);

  useEffect(() => {
    setReleaseLoading(true);
    listReleases({ resourceName, resourceType, environment }).then(data => {
      setReleases(data.releases || []);
      if (data.releases && data.releases.length > 0 && !value) {
        // Select the latest by lastSeenTimestampMillis
        const latest = data.releases.reduce((a, b) => (a.lastSeenTimestampMillis && b.lastSeenTimestampMillis && a.lastSeenTimestampMillis > b.lastSeenTimestampMillis ? a : b));
        setSelectedRelease(latest.version);
        onChange?.(latest.version);
      }
      setReleaseLoading(false);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setSelectedRelease(value);
  }, [value]);

  const handleAddRelease = async () => {
    setAddReleaseLoading(true);
    await createNewRelease({ resourceName, environment, resourceType, version: newReleaseName });
    // Refetch releases and select the new one
    const data = await listReleases({ resourceName, resourceType, environment });
    setReleases(data.releases || []);
    setSelectedRelease(newReleaseName);
    setShowAddRelease(false);
    setNewReleaseName('');
    setAddReleaseLoading(false);
    onChange?.(newReleaseName);
    onReleaseAdded?.(newReleaseName);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      {label && <span style={{ fontSize: 12, color: '#888', minWidth: 54 }}>{label}</span>}
      {releaseLoading ? (
        <Spin />
      ) : showAddRelease ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            placeholder="Release version"
            value={newReleaseName}
            onChange={e => setNewReleaseName(e.target.value)}
            disabled={addReleaseLoading}
            style={{ width: 120 }}
            size="small"
          />
          <Button
            size="small"
            onClick={() => {
              setShowAddRelease(false);
              setNewReleaseName('');
            }}
            disabled={addReleaseLoading}
          >
            Cancel
          </Button>
          <Button
            size="small"
            type="primary"
            loading={addReleaseLoading}
            disabled={addReleaseLoading || !newReleaseName.trim()}
            onClick={handleAddRelease}
          >
            Ok
          </Button>
        </div>
      ) : (
        <Select
          placeholder="Release"
          value={selectedRelease}
          onChange={val => {
            if (val === '__add__') setShowAddRelease(true);
            else {
              setSelectedRelease(val);
              onChange?.(val);
            }
          }}
          style={{ minWidth: 120, flex: 1 }}
          size="small"
          placement={placement}
          options={[
            { label: '+ Add Release', value: '__add__' },
            ...releases.map(r => ({ label: r.version, value: r.version }))
          ]}
        />
      )}
    </div>
  );
}; 