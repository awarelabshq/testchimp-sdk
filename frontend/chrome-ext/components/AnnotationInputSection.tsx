import React from 'react';
import { Input, Button, Tag } from 'antd';
import { SelectOutlined, BorderOutlined } from '@ant-design/icons';
import type { ElementAreaSelection } from '../useElementAreaSelections';

interface AnnotationInputSectionProps {
  text: string;
  onTextChange: (value: string) => void;
  selections: ElementAreaSelection[];
  onAddElement: () => void;
  onAddArea: () => void;
  onRemoveSelection: (index: number) => void;
  disabled?: boolean;
  textPlaceholder?: string;
  showSelections?: boolean;
  elementButtonLabel?: string;
  areaButtonLabel?: string;
}

function selectionLabel(sel: ElementAreaSelection): string {
  if (sel.type === 'element') {
    return sel.querySelector || 'Element';
  }
  const { xPct, yPct } = sel.boundingBox;
  return `Area (${xPct?.toFixed(1) ?? 0}%, ${yPct?.toFixed(1) ?? 0}%)`;
}

export const AnnotationInputSection: React.FC<AnnotationInputSectionProps> = ({
  text,
  onTextChange,
  selections,
  onAddElement,
  onAddArea,
  onRemoveSelection,
  disabled = false,
  textPlaceholder = 'Note text…',
  showSelections = true,
  elementButtonLabel = 'Add element',
  areaButtonLabel = 'Add area',
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Input.TextArea
      placeholder={textPlaceholder}
      value={text}
      onChange={(e) => onTextChange(e.target.value)}
      autoSize={{ minRows: 3, maxRows: 6 }}
      disabled={disabled}
      style={{ resize: 'none' }}
    />
    {showSelections && selections.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {selections.map((sel, index) => (
          <Tag
            key={index}
            closable
            onClose={(e) => {
              e.preventDefault();
              onRemoveSelection(index);
            }}
            icon={sel.type === 'element' ? <SelectOutlined /> : <BorderOutlined />}
            style={{
              margin: 0,
              padding: '2px 8px',
              border: '1px solid #72BDA3',
              background: '#181818',
              color: '#72BDA3',
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                maxWidth: 260,
                verticalAlign: 'middle',
              }}
            >
              {selectionLabel(sel)}
            </span>
          </Tag>
        ))}
      </div>
    )}
    <div style={{ display: 'flex', gap: 8 }}>
      <Button
        type="dashed"
        size="small"
        icon={<SelectOutlined />}
        onClick={onAddElement}
        disabled={disabled}
        style={{ flex: 1 }}
      >
        {elementButtonLabel}
      </Button>
      <Button
        type="dashed"
        size="small"
        icon={<BorderOutlined />}
        onClick={onAddArea}
        disabled={disabled}
        style={{ flex: 1 }}
      >
        {areaButtonLabel}
      </Button>
    </div>
  </div>
);
