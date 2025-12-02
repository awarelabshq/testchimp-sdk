import React from 'react';
import { Popover, Button } from 'antd';
import { IgnoreReason } from '../datas';

interface IgnoreBugPopoverProps {
  children: React.ReactElement;
  onIgnore: (reason: IgnoreReason) => void;
  onCancel?: () => void;
}

const IgnoreBugPopover: React.FC<IgnoreBugPopoverProps> = ({ children, onIgnore, onCancel }) => {
  const [open, setOpen] = React.useState(false);

  const handleReasonClick = (reason: IgnoreReason) => {
    onIgnore(reason);
    setOpen(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setOpen(false);
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
      <Button
        type="default"
        block
        size="small"
        onClick={() => handleReasonClick(IgnoreReason.INTENDED_BEHAVIOUR)}
        style={{ 
          textAlign: 'left',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          height: '32px',
          fontSize: '13px'
        }}
      >
        Intended behaviour
      </Button>
      <Button
        type="default"
        block
        size="small"
        onClick={() => handleReasonClick(IgnoreReason.INACCURATE_ASSESSMENT)}
        style={{ 
          textAlign: 'left',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          height: '32px',
          fontSize: '13px'
        }}
      >
        Inaccurate assessment
      </Button>
      <Button
        type="default"
        block
        size="small"
        onClick={() => handleReasonClick(IgnoreReason.NOT_IMPORTANT)}
        style={{ 
          textAlign: 'left',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          height: '32px',
          fontSize: '13px'
        }}
      >
        Not important
      </Button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Button size="small" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="left"
    >
      {children}
    </Popover>
  );
};

export default IgnoreBugPopover;

