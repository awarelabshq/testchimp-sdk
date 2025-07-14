import React from 'react';
import { Row, Col, Select } from 'antd';
import { ScreenStates } from '../datas';

interface ScreenStateSelectorProps {
  screenStates: ScreenStates[];
  selectedScreen?: string;
  setSelectedScreen: (screen?: string) => void;
  selectedState?: string;
  setSelectedState: (state?: string) => void;
  onAddScreen?: () => void;
  onAddState?: () => void;
  disableScreenSelect?: boolean;
  disableStateSelect?: boolean;
}

export const ScreenStateSelector: React.FC<ScreenStateSelectorProps> = ({
  screenStates,
  selectedScreen,
  setSelectedScreen,
  selectedState,
  setSelectedState,
  onAddScreen,
  onAddState,
  disableScreenSelect,
  disableStateSelect,
}) => {
  const stateOptions = screenStates.find((s) => s.screen === selectedScreen)?.states || [];
  const screenOptions = [
    ...screenStates.map(s => ({ label: s.screen, value: s.screen })),
    { label: '➕ Add screen', value: '__add_screen__', key: 'add_screen' },
  ];
  const stateDropdownOptions = [
    ...stateOptions.map((s) => ({ label: s, value: s })),
    { label: '➕ Add state', value: '__add_state__', key: 'add_state' },
  ];
  return (
    <div className="fade-in">
      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>Screen</div>
          <Select
            style={{ width: '100%' }}
            placeholder="Select screen"
            value={selectedScreen}
            onChange={val => {
              if (val === '__add_screen__') {
                onAddScreen && onAddScreen();
              } else {
                setSelectedScreen(val);
              }
            }}
            options={screenOptions}
            disabled={disableScreenSelect}
          />
        </Col>
        <Col flex="auto">
          <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>State</div>
          <Select
            style={{ width: '100%' }}
            placeholder="Select state"
            value={selectedState}
            onChange={val => {
              if (val === '__add_state__') {
                onAddState && onAddState();
              } else {
                setSelectedState(val);
              }
            }}
            options={stateDropdownOptions}
            allowClear
            disabled={disableStateSelect || stateOptions.length === 0}
          />
        </Col>
      </Row>
    </div>
  );
}; 