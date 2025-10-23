import React, { useState, useEffect } from 'react';
import { Input, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StepItemProps {
  index: number;
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
}

export const StepItem: React.FC<StepItemProps> = ({ index, value, onChange, onRemove }) => {
  const [text, setText] = useState<string>(value);
  const [showDelete, setShowDelete] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sync local state with prop changes
  useEffect(() => {
    setText(value);
  }, [value]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    onChange(newText);
  };

  return (
    <div 
      style={{ display: 'flex', gap: 8, width: '100%', position: 'relative', margin: 0, padding: 0 }}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div style={{ flex: 1, position: 'relative', width: '100%' }}>
        {isEditing ? (
          <Input.TextArea 
            autoSize 
            value={text} 
            onChange={e => handleTextChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            autoFocus
            style={{ width: '100%', fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            style={{ 
              cursor: 'text',
              padding: '8px 12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              backgroundColor: '#2a2a2a',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              color: 'white',
              width: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden'
            }}
          >
            <SyntaxHighlighter
              language="javascript"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: 0,
                background: 'transparent',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                width: '100%',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                maxWidth: '100%'
              }}
              showLineNumbers={false}
              wrapLines={true}
            >
              {text}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
      <div style={{ 
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        opacity: showDelete ? 1 : 0,
        transition: 'opacity 0.2s ease',
        zIndex: 1
      }}>
        <Popconfirm title="Remove this step?" onConfirm={onRemove} okText="Remove" cancelText="Cancel">
          <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 14 }} />
        </Popconfirm>
      </div>
    </div>
  );
};


