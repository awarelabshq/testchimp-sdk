import React, { useState, useEffect, useRef } from 'react';
import { Input, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StepItemProps {
  index: number;
  commands: string[];  // Array of commands
  selectedIndex: number;  // Current selected index
  onChange: (selectedIndex: number) => void;  // Callback when cycling commands
  onEdit?: (newCommand: string) => void;  // Callback when manually editing text
  onRemove: () => void;
}

export const StepItem: React.FC<StepItemProps> = ({ index, commands, selectedIndex, onChange, onEdit, onRemove }) => {
  const [showControls, setShowControls] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the current command
  const currentCommand = commands[selectedIndex] || commands[0] || '';
  const hasMultipleCommands = commands.length > 1;

  // Sync local text with current command
  useEffect(() => {
    setText(currentCommand);
  }, [currentCommand]);

  // Check if this is an assertion step
  const isAssertion = currentCommand.includes('await expect(');
  const stepColor = isAssertion ? '#52c41a' : '#1890ff';

  const handleCycleCommand = () => {
    // Cycle to next command (wrap around)
    const nextIndex = (selectedIndex + 1) % commands.length;
    onChange(nextIndex);
  };
  
  const handleTextChange = (newText: string) => {
    setText(newText);
  };
  
  const handleBlur = () => {
    setIsEditing(false);
    // If text was edited and differs from current command, notify parent
    if (onEdit && text !== currentCommand) {
      onEdit(text);
    }
  };

  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    // Only hide if popover is not open
    // Add a small delay to allow mouse to reach the popover
    if (!popoverOpen) {
      hideTimeoutRef.current = setTimeout(() => {
        if (!popoverOpen) {
          setShowControls(false);
        }
      }, 100);
    }
  };

  const handlePopoverOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (open) {
      // Clear any pending hide timeout when popover opens
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      // Ensure controls stay visible when popover is open
      setShowControls(true);
    } else {
      // When popover closes, hide controls after a short delay
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 100);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      style={{ display: 'flex', gap: 8, width: '100%', position: 'relative', margin: 0, padding: 0, alignItems: 'flex-start' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Refresh icon - only show on hover if multiple commands */}
      {hasMultipleCommands && showControls && (
        <Tooltip title={`Command ${selectedIndex + 1} of ${commands.length} (click to cycle)`}>
          <ReloadOutlined 
            onClick={handleCycleCommand}
            style={{ 
              color: stepColor,
              cursor: 'pointer',
              fontSize: 14,
              marginTop: 12,
              flexShrink: 0
            }}
          />
        </Tooltip>
      )}
      
      <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
        {isEditing ? (
          <Input.TextArea 
            autoSize={{ minRows: 1, maxRows: 10 }}
            value={text} 
            onChange={e => handleTextChange(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{ 
              width: '100%', 
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            style={{ 
              cursor: 'text',
              padding: '8px 12px',
              border: `1px solid ${stepColor}20`,
              borderRadius: '6px',
              backgroundColor: isAssertion ? '#1a2f1a' : '#2a2a2a',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              color: stepColor,
              width: '100%',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              boxSizing: 'border-box'
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
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                maxWidth: '100%',
                boxSizing: 'border-box',
                color: stepColor
              }}
              showLineNumbers={false}
              wrapLines={true}
              wrapLongLines={true}
            >
              {text}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
      
      {showControls && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginTop: 8,
          flexShrink: 0
        }}>
          <Popconfirm 
            title="Remove this step?" 
            onConfirm={onRemove} 
            okText="Remove" 
            cancelText="Cancel"
            open={popoverOpen}
            onOpenChange={handlePopoverOpenChange}
          >
            <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 14 }} />
          </Popconfirm>
        </div>
      )}
    </div>
  );
};


