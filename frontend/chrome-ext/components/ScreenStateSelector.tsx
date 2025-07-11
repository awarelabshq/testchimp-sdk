import React from 'react';
import { Row, Col, Select } from 'antd';
import { ScreenStates } from '../datas';

interface ScreenStateSelectorProps {
  screenStates: ScreenStates[];
  selectedScreen?: string;
  setSelectedScreen: (screen?: string) => void;
  selectedState?: string;
  setSelectedState: (state?: string) => void;
}

export const ScreenStateSelector: React.FC<ScreenStateSelectorProps> = ({
  screenStates,
  selectedScreen,
  setSelectedScreen,
  selectedState,
  setSelectedState,
}) => {
  const stateOptions = screenStates.find((s) => s.screen === selectedScreen)?.states || [];
  return (
    <Row gutter={8} style={{ marginBottom: 12 }}>
      <Col flex="auto">
        <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>Screen</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Select screen"
          value={selectedScreen}
          onChange={val => setSelectedScreen(val)}
          options={screenStates.map(s => ({ label: s.screen, value: s.screen }))}
        />
      </Col>
      <Col flex="auto">
        <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>State</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Select state"
          value={selectedState}
          onChange={val => setSelectedState(val)}
          options={stateOptions.map((s) => ({ label: s, value: s }))}
          allowClear
          disabled={stateOptions.length === 0}
        />
      </Col>
    </Row>
  );
}; 