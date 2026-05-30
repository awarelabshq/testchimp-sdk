import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Row, Col, AutoComplete, message } from 'antd';
import { ScreenStates } from '../datas';
import { upsertScreenStates } from '../apiService';

const DEFAULT_STATE = 'default';

interface ScreenStateSelectorProps {
  screenStates: ScreenStates[];
  selectedScreen?: string;
  setSelectedScreen: (screen?: string) => void;
  selectedState?: string;
  setSelectedState: (state?: string) => void;
  onScreenStatesRefresh?: () => Promise<void>;
  disableScreenSelect?: boolean;
  disableStateSelect?: boolean;
}

export const ScreenStateSelector: React.FC<ScreenStateSelectorProps> = ({
  screenStates,
  selectedScreen,
  setSelectedScreen,
  selectedState,
  setSelectedState,
  onScreenStatesRefresh,
  disableScreenSelect,
  disableStateSelect,
}) => {
  const [screenUpserting, setScreenUpserting] = useState(false);
  const [stateUpserting, setStateUpserting] = useState(false);
  const skipScreenBlurRef = useRef(false);
  const skipStateBlurRef = useRef(false);

  const stateOptions = useMemo(
    () => screenStates.find((s) => s.screen === selectedScreen)?.states || [],
    [screenStates, selectedScreen]
  );

  const screenAutoCompleteOptions = useMemo(
    () => screenStates.map((s) => ({ value: s.screen })),
    [screenStates]
  );

  const stateAutoCompleteOptions = useMemo(
    () => stateOptions.map((s) => ({ value: s })),
    [stateOptions]
  );

  const commitScreen = useCallback(
    async (raw: string | undefined) => {
      const trimmed = (raw ?? '').trim();
      if (!trimmed) {
        setSelectedScreen(undefined);
        setSelectedState(undefined);
        return;
      }

      setSelectedScreen(trimmed);

      const screenExists = screenStates.some((s) => s.screen === trimmed);
      if (screenExists) {
        if (selectedState && !stateOptions.includes(selectedState)) {
          setSelectedState(undefined);
        }
        return;
      }

      setScreenUpserting(true);
      try {
        await upsertScreenStates({
          screenStates: [{ screen: trimmed, states: [DEFAULT_STATE] }],
        });
        await onScreenStatesRefresh?.();
        setSelectedState((current) => current ?? DEFAULT_STATE);
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to add screen');
      } finally {
        setScreenUpserting(false);
      }
    },
    [onScreenStatesRefresh, screenStates, selectedState, setSelectedScreen, setSelectedState, stateOptions]
  );

  const commitState = useCallback(
    async (raw: string | undefined) => {
      const trimmed = (raw ?? '').trim();
      if (!trimmed) {
        setSelectedState(undefined);
        return;
      }

      if (!selectedScreen?.trim()) {
        message.warning('Select a screen before adding a state');
        setSelectedState(undefined);
        return;
      }

      setSelectedState(trimmed);

      if (stateOptions.includes(trimmed)) {
        return;
      }

      setStateUpserting(true);
      try {
        await upsertScreenStates({
          screenStates: [{ screen: selectedScreen.trim(), states: [trimmed] }],
        });
        await onScreenStatesRefresh?.();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to add state');
      } finally {
        setStateUpserting(false);
      }
    },
    [onScreenStatesRefresh, selectedScreen, setSelectedState, stateOptions]
  );

  return (
    <div className="fade-in">
      <Row gutter={8} style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>Screen</div>
          <AutoComplete
            style={{ width: '100%' }}
            placeholder="Select or type screen"
            value={selectedScreen}
            options={screenAutoCompleteOptions}
            disabled={disableScreenSelect || screenUpserting}
            allowClear
            filterOption={(input, option) =>
              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={(val) => setSelectedScreen(val?.trim() ? val : undefined)}
            onSelect={(val) => {
              skipScreenBlurRef.current = true;
              void commitScreen(val);
            }}
            onBlur={() => {
              if (skipScreenBlurRef.current) {
                skipScreenBlurRef.current = false;
                return;
              }
              void commitScreen(selectedScreen);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                skipScreenBlurRef.current = true;
                void commitScreen(selectedScreen);
              }
            }}
          />
        </Col>
        <Col flex="auto">
          <div style={{ marginBottom: 4, fontSize: 12, color: '#888' }}>State</div>
          <AutoComplete
            style={{ width: '100%' }}
            placeholder="Select or type state"
            value={selectedState}
            options={stateAutoCompleteOptions}
            disabled={disableStateSelect || stateUpserting || !selectedScreen?.trim()}
            allowClear
            filterOption={(input, option) =>
              (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={(val) => setSelectedState(val?.trim() ? val : undefined)}
            onSelect={(val) => {
              skipStateBlurRef.current = true;
              void commitState(val);
            }}
            onBlur={() => {
              if (skipStateBlurRef.current) {
                skipStateBlurRef.current = false;
                return;
              }
              void commitState(selectedState);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                skipStateBlurRef.current = true;
                void commitState(selectedState);
              }
            }}
          />
        </Col>
      </Row>
    </div>
  );
};
