import React, { useState, useEffect } from 'react';
import { Button, Tooltip, Dropdown, Menu } from 'antd';
import { PlusOutlined, SelectOutlined, BorderOutlined, DragOutlined } from '@ant-design/icons';
import { ContextElementType } from '../datas';
import { getBasicInfo, getBasicInfoForBoxElements } from '../contextStore';

export interface ContextTag {
  id?: string;
  type: ContextElementType;
  value: string | { xPct: number; yPct: number; wPct: number; hPct: number };
  role?: string;
  text?: string;
  tagName?: string;
  uiElementsInBox?: any[]; // Optional, for bounding box context
}

function getElementLabel(tag: ContextTag) {
  if (!tag || typeof tag !== 'object') return '';
  let label = '';
  if (tag.text) label = `"${tag.text}"`;
  else if (tag.role) label = `[${tag.role}]`;
  else if (tag.id) label = `[id=${tag.id}]`;
  else if (tag.tagName) label = `<${tag.tagName}>`;
  else if (tag.value) label = tag.value as string;
  if (label.length > 15) label = label.slice(0, 15) + '…';
  return label;
}

function formatBoundingBoxValue(value: { xPct: number; yPct: number; wPct: number; hPct: number }): string {
  return `(${Math.round(value.xPct)}vw, ${Math.round(value.yPct)}vh, ${Math.round(value.wPct)}vw, ${Math.round(value.hPct)}vh)`;
}

export interface ContextWindowPanelProps {
  contextTags: ContextTag[];
  onRemove: (idx: number) => void;
  onClear: () => void;
  onAddTag: (tag: ContextTag) => void;
}

export const ContextWindowPanel: React.FC<ContextWindowPanelProps> = ({
  contextTags,
  onRemove,
  onClear,
  onAddTag,
}) => {
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'normal' | 'select' | 'box'>('normal');

  useEffect(() => {
    function onPageMessage(event: MessageEvent) {
      if (!event.data || typeof event.data.type !== 'string') return;
      if (event.data.type === 'elementSelected' && event.data.querySelector) {
        const querySelector = event.data.querySelector;
        const element = document.querySelector(querySelector) as HTMLElement | null;
        let tag: ContextTag = {
          id: undefined,
          type: ContextElementType.UIElement,
          value: querySelector,
          role: event.data.role,
          text: event.data.text,
          tagName: event.data.tagName,
        };
        if (element) {
          // Use getBasicInfo for all fields
          const basicInfo = getBasicInfo(element);
          Object.assign(tag, basicInfo);
        }
        onAddTag(tag);
        setCurrentMode('normal');
        window.postMessage({ type: 'tc-show-sidebar' }, '*');
      }
      if (event.data.type === 'boxDrawn' && event.data.coords) {
        const { left, top, width, height } = event.data.coords;
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        const xPct = (parseFloat(left) / vw) * 100;
        const yPct = (parseFloat(top) / vh) * 100;
        const wPct = (parseFloat(width) / vw) * 100;
        const hPct = (parseFloat(height) / vw) * 100;
        // Use getBasicInfoForBoxElements for uiElementsInBox
        const uiElementsInBox = getBasicInfoForBoxElements({ xPct, yPct, wPct, hPct });
        const tag: ContextTag = {
          id: undefined,
          type: ContextElementType.BoundingBox,
          value: { xPct, yPct, wPct, hPct },
          uiElementsInBox
        };
        onAddTag(tag);
        setCurrentMode('normal');
        window.postMessage({ type: 'tc-show-sidebar' }, '*');
      }
    }
    window.addEventListener('message', onPageMessage);
    // Defensive: always revert to normal if mode is box and user clicks anywhere
    function onAnyClick() {
      if (currentMode === 'box') setCurrentMode('normal');
    }
    if (currentMode === 'box') {
      window.addEventListener('mousedown', onAnyClick, true);
    }
    return () => {
      window.removeEventListener('message', onPageMessage);
      window.removeEventListener('mousedown', onAnyClick, true);
    };
  }, [currentMode, onAddTag]);

  useEffect(() => {
    if (currentMode === 'select') {
      window.postMessage({ type: 'startElementSelect' }, '*');
    } else if (currentMode === 'box') {
      window.postMessage({ type: 'startBoxDraw' }, '*');
    }
  }, [currentMode]);

  const contextMenu = (
    <Menu
      onClick={({ key }) => {
        if (key === 'select') {
          window.postMessage({ type: 'tc-hide-sidebar' }, '*');
          setCurrentMode('select');
        }
        if (key === 'box') {
          window.postMessage({ type: 'tc-hide-sidebar' }, '*');
          setCurrentMode('box');
        }
        setContextMenuOpen(false);
      }}
      items={[
        {
          key: 'select',
          icon: <DragOutlined style={{ fontSize: 16 }} />, label: 'Select element',
        },
        {
          key: 'box',
          icon: <BorderOutlined style={{ fontSize: 16 }} />, label: 'Select area',
        },
      ]}
    />
  );

  return (
    <div className="tc-section" style={{ minHeight: 120, marginTop: 0, marginBottom: 4, padding: 8, display: 'flex', flexDirection: 'column', background: '#181818', border: '1.5px solid #333', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div>
          <div className="tc-context-title">Add Context</div>
          {contextTags.length === 0 && (
            <div className="tc-context-subheading">Elements or areas to help the IDE understand your intent</div>
          )}
        </div>
        {contextTags.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: 12,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
              fontWeight: 400
            }}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {contextTags.map((tag, idx) => (
          <Tooltip key={idx} title={tag.type === ContextElementType.UIElement ? 'Element Selector' : 'Bounding Box'}>
            <Button
              type="default"
              size="small"
              style={{ padding: '0 8px', borderRadius: 4, height: 24, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onRemove(idx)}
            >
              {tag.type === ContextElementType.UIElement ? (
                <>
                  <SelectOutlined style={{ fontSize: 14, marginRight: 2 }} />
                  {getElementLabel(tag)}
                </>
              ) : (
                <>
                  <BorderOutlined style={{ fontSize: 14, marginRight: 2 }} />
                  {formatBoundingBoxValue(tag.value as { xPct: number; yPct: number; wPct: number; hPct: number })}
                </>
              )}
              <span style={{ marginLeft: 4, color: '#ff4d4f' }}>×</span>
            </Button>
          </Tooltip>
        ))}
        <Dropdown overlay={contextMenu} trigger={['click']} open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
          <Button
            icon={<PlusOutlined style={{ fontSize: 16 }} />}
            size="small"
            style={{ borderRadius: 4, height: 24, padding: 0, width: 28, minWidth: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Dropdown>
      </div>
    </div>
  );
}; 