import React, { useEffect, useState } from 'react';
import { Input, Select, Button, Modal, Spin } from 'antd';
import { SelectOutlined } from '@ant-design/icons';
import { updateBugs, listReleases, createNewRelease, ReleaseInfo, ResourceType } from '../apiService';
import { BugSeverity, BugStatus, BugCategory, Bug, JourneyAgnotism, BoundingBox } from '../datas';
import { useElementSelector } from '../elementSelector';
import { getUniqueSelector } from '../html_utils';

interface AddBugPanelProps {
  screen?: string;
  state?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const SEVERITY_OPTIONS = [
  { label: 'S1', value: BugSeverity.High },
  { label: 'S2', value: BugSeverity.Medium },
  { label: 'S3', value: BugSeverity.Low },
];

const BUG_CATEGORY_OPTIONS = Object.values(BugCategory).map(cat => ({
  label: (cat as string).charAt(0) + (cat as string).slice(1).toLowerCase().replace(/_/g, ' '),
  value: cat as string
}));

export const AddBugPanel: React.FC<AddBugPanelProps> = ({ screen, state, onCancel, onSuccess }) => {
  const [addBugTitle, setAddBugTitle] = useState('');
  const [addBugDescription, setAddBugDescription] = useState('');
  const [addBugSeverity, setAddBugSeverity] = useState<BugSeverity | undefined>(undefined);
  const [addBugCategory, setAddBugCategory] = useState<string | undefined>(undefined);
  const [addBugElement, setAddBugElement] = useState<{ element: HTMLElement, querySelector: string } | null>(null);
  const [addBugLoading, setAddBugLoading] = useState(false);
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<string | undefined>(undefined);
  const [releaseLoading, setReleaseLoading] = useState(true);
  const [showAddRelease, setShowAddRelease] = useState(false);
  const [newReleaseName, setNewReleaseName] = useState('');
  const [addReleaseLoading, setAddReleaseLoading] = useState(false);

  const { selecting, startSelecting } = useElementSelector((element, querySelector) => {
    setAddBugElement({ element, querySelector });
  });

  useEffect(() => {
    setReleaseLoading(true);
    listReleases({
      resourceName: '_webapp',
      resourceType: ResourceType.WEBAPP_RESOURCE,
      environment: 'QA',
    }).then(data => {
      setReleases(data.releases || []);
      if (data.releases && data.releases.length > 0) {
        // Select the latest by lastSeenTimestampMillis
        const latest = data.releases.reduce((a, b) => (a.lastSeenTimestampMillis && b.lastSeenTimestampMillis && a.lastSeenTimestampMillis > b.lastSeenTimestampMillis ? a : b));
        setSelectedRelease(latest.version);
      }
      setReleaseLoading(false);
    });
  }, []);

  const handleAddRelease = async () => {
    setAddReleaseLoading(true);
    await createNewRelease({
      resourceName: '_webapp',
      environment: 'QA',
      resourceType: ResourceType.WEBAPP_RESOURCE,
      version: newReleaseName,
    });
    // Refetch releases and select the new one
    const data = await listReleases({
      resourceName: '_webapp',
      resourceType: ResourceType.WEBAPP_RESOURCE,
      environment: 'QA',
    });
    setReleases(data.releases || []);
    setSelectedRelease(newReleaseName);
    setShowAddRelease(false);
    setNewReleaseName('');
    setAddReleaseLoading(false);
  };

  return (
    <div className="add-bug-panel" style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10000,
      background: '#181818',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      boxShadow: '0 -2px 24px rgba(0,0,0,0.28)',
      padding: '24px 16px 16px 16px',
      maxWidth: 520,
      margin: '0 auto',
      width: '100%',
      minHeight: 0
    }}>
      {showAddRelease ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, color: '#fff', marginBottom: 8, fontSize: 14 }}>Add Release</div>
          <Input
            placeholder="Release version"
            value={newReleaseName}
            onChange={e => setNewReleaseName(e.target.value)}
            disabled={addReleaseLoading}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setShowAddRelease(false);
                setNewReleaseName('');
              }}
              disabled={addReleaseLoading}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={addReleaseLoading}
              disabled={addReleaseLoading || !newReleaseName.trim()}
              onClick={async () => {
                setAddReleaseLoading(true);
                await createNewRelease({
                  resourceName: '_webapp',
                  environment: 'QA',
                  resourceType: ResourceType.WEBAPP_RESOURCE,
                  version: newReleaseName,
                });
                // Refetch releases and select the new one
                const data = await listReleases({
                  resourceName: '_webapp',
                  resourceType: ResourceType.WEBAPP_RESOURCE,
                  environment: 'QA',
                });
                setReleases(data.releases || []);
                setSelectedRelease(newReleaseName);
                setShowAddRelease(false);
                setNewReleaseName('');
                setAddReleaseLoading(false);
              }}
            >
              Ok
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <Input
            placeholder="Bug title"
            value={addBugTitle}
            onChange={e => setAddBugTitle(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
            disabled={addBugLoading}
          />
          <Input.TextArea
            placeholder="Description"
            value={addBugDescription}
            onChange={e => setAddBugDescription(e.target.value)}
            autoSize={{ minRows: 10, maxRows: 10 }}
            style={{ width: '100%', marginBottom: 8, resize: 'none' }}
            disabled={addBugLoading}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Select
              placeholder="Severity"
              value={addBugSeverity}
              onChange={val => setAddBugSeverity(val)}
              options={SEVERITY_OPTIONS}
              style={{ flex: 1 }}
              disabled={addBugLoading}
              placement="topLeft"
              getPopupContainer={trigger => trigger.parentNode}
            />
            <Select
              placeholder="Category"
              value={addBugCategory}
              onChange={val => setAddBugCategory(val)}
              options={BUG_CATEGORY_OPTIONS}
              style={{ flex: 2 }}
              disabled={addBugLoading}
              placement="topLeft"
              getPopupContainer={trigger => trigger.parentNode}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#888', minWidth: 54 }}>Release</span>
            {releaseLoading ? (
              <Spin />
            ) : (
              <Select
                placeholder="Release"
                value={selectedRelease}
                onChange={val => {
                  if (val === '__add__') setShowAddRelease(true);
                  else setSelectedRelease(val);
                }}
                style={{ flex: 1 }}
                disabled={addBugLoading}
                placement="topLeft"
                getPopupContainer={trigger => trigger.parentNode}
                options={[
                  { label: '+ Add Release', value: '__add__' },
                  ...releases.map(r => ({ label: r.version, value: r.version }))
                ]}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {addBugElement ? (
              <Button
                type="default"
                size="small"
                style={{ border: '1px solid #72BDA3', borderRadius: 4, background: '#181818', color: '#72BDA3', fontWeight: 500, flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setAddBugElement(null)}
                disabled={addBugLoading}
              >
                <SelectOutlined style={{ fontSize: 14 }} />
                <span style={{
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                }}>{addBugElement.querySelector}</span>
                <span style={{ marginLeft: 4, color: '#ff4d4f' }}>×</span>
              </Button>
            ) : (
              <Button
                type="dashed"
                size="small"
                style={{ borderStyle: 'dashed', borderRadius: 4, color: '#888', flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}
                icon={<SelectOutlined style={{ fontSize: 14 }} />}
                onClick={startSelecting}
                disabled={addBugLoading || selecting}
              >
                Add element
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              onClick={onCancel}
              disabled={addBugLoading}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={addBugLoading}
              disabled={addBugLoading || !addBugTitle.trim() || !addBugSeverity || !addBugCategory || !selectedRelease}
              onClick={async () => {
                setAddBugLoading(true);
                try {
                  const bug: Bug = {
                    title: addBugTitle.trim(),
                    description: addBugDescription.trim(),
                    severity: addBugSeverity,
                    category: addBugCategory,
                    location: addBugElement ? getUniqueSelector(addBugElement.element) : undefined,
                    screen: screen || undefined,
                    screenState: state || undefined,
                  };
                  await updateBugs({
                    updatedBugs: [bug],
                    newStatus: BugStatus.ACTIVE,
                  });
                  setAddBugTitle('');
                  setAddBugDescription('');
                  setAddBugSeverity(undefined);
                  setAddBugCategory(undefined);
                  setAddBugElement(null);
                  setSelectedRelease(undefined);
                  onSuccess();
                } catch (e) {
                  // Optionally show error
                }
                setAddBugLoading(false);
              }}
            >
              Ok
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 