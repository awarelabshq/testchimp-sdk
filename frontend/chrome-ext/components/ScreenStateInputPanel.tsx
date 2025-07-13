import React, { useEffect, useState } from 'react';
import { AutoComplete, Spin } from 'antd';
import { getScreenStates } from '../apiService';

interface ScreenStateInputPanelProps {
  value?: { screen: string; state: string };
  onChange?: (val: { screen: string; state: string }) => void;
  disabled?: boolean;
  initialScreen?: string;
  initialState?: string;
  style?: React.CSSProperties;
}

export const ScreenStateInputPanel: React.FC<ScreenStateInputPanelProps> = ({
  value,
  onChange,
  disabled,
  initialScreen = '',
  initialState = '',
  style,
}) => {
  const [screen, setScreen] = useState(value?.screen || initialScreen || '');
  const [state, setState] = useState(value?.state || initialState || '');
  const [screenOptions, setScreenOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getScreenStates().then(data => {
      const screens = (data.screenStates || []).map(s => s.screen).filter(Boolean) as string[];
      setScreenOptions(screens);
      if (screen) {
        const found = (data.screenStates || []).find(s => s.screen === screen);
        setStateOptions(found?.states || []);
      }
      setLoading(false);
    });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (screen) {
      setLoading(true);
      getScreenStates().then(data => {
        const found = (data.screenStates || []).find(s => s.screen === screen);
        setStateOptions(found?.states || []);
        setLoading(false);
      });
    } else {
      setStateOptions([]);
    }
  }, [screen]);

  useEffect(() => {
    onChange?.({ screen, state });
    // eslint-disable-next-line
  }, [screen, state]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#fff', marginBottom: 4 }}>Screen</div>
        <AutoComplete
          style={{ width: '100%' }}
          options={screenOptions.map(s => ({ value: s }))}
          value={screen}
          onChange={val => setScreen(val)}
          placeholder="Enter or select screen name"
          disabled={disabled || !!initialScreen}
          filterOption={(inputValue, option) => !!option?.value && option.value.toLowerCase().includes(inputValue.toLowerCase())}
        />
      </div>
      <div>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#fff', marginBottom: 4 }}>State</div>
        <AutoComplete
          style={{ width: '100%' }}
          options={stateOptions.map(s => ({ value: s }))}
          value={state}
          onChange={val => setState(val)}
          placeholder="Enter or select state name"
          disabled={disabled}
          filterOption={(inputValue, option) => !!option?.value && option.value.toLowerCase().includes(inputValue.toLowerCase())}
        />
      </div>
      {loading && <Spin />}
    </div>
  );
}; 