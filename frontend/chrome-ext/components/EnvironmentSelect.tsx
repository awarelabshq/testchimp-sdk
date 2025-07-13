import React, { useEffect, useState } from 'react';
import { Select, Spin, Input, Button } from 'antd';
import { listEnvironments, addEnvironment } from '../apiService';

interface EnvironmentSelectProps {
  value?: string;
  onChange?: (val: string | undefined) => void;
  label?: string;
  style?: React.CSSProperties;
  onEnvironmentAdded?: (environment: string) => void;
  placement?: 'bottomLeft' | 'topLeft';
}

export const EnvironmentSelect: React.FC<EnvironmentSelectProps> = ({
  value,
  onChange,
  label = '',
  style,
  onEnvironmentAdded,
  placement = 'bottomLeft',
}) => {
  const [environments, setEnvironments] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | undefined>(value);
  const [environmentLoading, setEnvironmentLoading] = useState(true);
  const [showAddEnvironment, setShowAddEnvironment] = useState(false);
  const [newEnvironmentName, setNewEnvironmentName] = useState('');
  const [addEnvironmentLoading, setAddEnvironmentLoading] = useState(false);

  useEffect(() => {
    setEnvironmentLoading(true);
    listEnvironments().then(data => {
      setEnvironments(data.environments || []);
      if (data.environments && data.environments.length > 0 && !value) {
        // Default to 'QA' if present, otherwise first environment
        const qaIndex = data.environments.findIndex(env => env === 'QA');
        const defaultEnv = qaIndex >= 0 ? data.environments[qaIndex] : data.environments[0];
        setSelectedEnvironment(defaultEnv);
        onChange?.(defaultEnv);
      }
      setEnvironmentLoading(false);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setSelectedEnvironment(value);
  }, [value]);

  const handleAddEnvironment = async () => {
    setAddEnvironmentLoading(true);
    await addEnvironment({ environment: newEnvironmentName });
    // Refetch environments and select the new one
    const data = await listEnvironments();
    setEnvironments(data.environments || []);
    setSelectedEnvironment(newEnvironmentName);
    setShowAddEnvironment(false);
    setNewEnvironmentName('');
    setAddEnvironmentLoading(false);
    onChange?.(newEnvironmentName);
    onEnvironmentAdded?.(newEnvironmentName);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      {label && <span style={{ fontSize: 12, color: '#888', minWidth: 70 }}>{label}</span>}
      {environmentLoading ? (
        <Spin />
      ) : showAddEnvironment ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            placeholder="Environment name"
            value={newEnvironmentName}
            onChange={e => setNewEnvironmentName(e.target.value)}
            disabled={addEnvironmentLoading}
            style={{ width: 120 }}
            size="small"
          />
          <Button
            size="small"
            onClick={() => {
              setShowAddEnvironment(false);
              setNewEnvironmentName('');
            }}
            disabled={addEnvironmentLoading}
          >
            Cancel
          </Button>
          <Button
            size="small"
            type="primary"
            loading={addEnvironmentLoading}
            disabled={addEnvironmentLoading || !newEnvironmentName.trim()}
            onClick={handleAddEnvironment}
          >
            Ok
          </Button>
        </div>
      ) : (
        <Select
          placeholder="Environment"
          value={selectedEnvironment}
          onChange={val => {
            if (val === '__add__') setShowAddEnvironment(true);
            else {
              setSelectedEnvironment(val);
              onChange?.(val);
            }
          }}
          style={{ minWidth: 120, flex: 1 }}
          size="small"
          placement={placement}
          options={[
            { label: '+ Add Environment', value: '__add__' },
            ...environments.map(env => ({ label: env, value: env }))
          ]}
        />
      )}
    </div>
  );
}; 