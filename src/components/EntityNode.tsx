import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface EntityNodeProps {
  data: {
    name: string;
    attributes: string[];
    onAttributesChange?: (attributes: string[]) => void;
  };
  isConnectable: boolean;
}

const EntityNode = ({ data, isConnectable }: EntityNodeProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditClick = (index: number, value: string) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleEditBlur = () => {
    if (editingIndex !== null && data.onAttributesChange) {
      const newAttrs = [...data.attributes];
      newAttrs[editingIndex] = editValue;
      data.onAttributesChange(newAttrs);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditBlur();
    }
  };

  const handleDelete = (index: number) => {
    if (data.onAttributesChange) {
      const newAttrs = data.attributes.filter((_, i) => i !== index);
      data.onAttributesChange(newAttrs);
    }
  };

  const handleAdd = () => {
    if (data.onAttributesChange) {
      data.onAttributesChange([...data.attributes, 'new_field']);
    }
    setEditingIndex(data.attributes.length);
    setEditValue('new_field');
  };

  return (
    <div className="px-0 py-0 shadow-md rounded-md bg-white border border-gray-200 min-w-[180px]">
      {/* Entity header */}
      <div className="bg-blue-100 px-4 py-2 border-b border-gray-200 font-bold text-center rounded-t-md">
        {data.name}
      </div>
      {/* Entity attributes */}
      <div className="px-4 py-2">
        <ul className="list-none space-y-1 text-xs">
          {data.attributes.map((attr, index) => (
            <li key={index} className="py-1 border-b border-gray-100 last:border-0 flex items-center gap-1 group">
              {editingIndex === index ? (
                <Input
                  autoFocus
                  value={editValue}
                  onChange={handleEditChange}
                  onBlur={handleEditBlur}
                  onKeyDown={handleEditKeyDown}
                  className="text-xs px-1 py-0 h-6"
                />
              ) : (
                <span
                  className={`flex-1 cursor-pointer ${attr.includes('(PK)') ? 'text-blue-500 font-medium' : attr.includes('(FK)') ? 'text-green-500' : ''}`}
                  onClick={() => handleEditClick(index, attr)}
                  title="Click to edit"
                >
                  {attr}
                </span>
              )}
              {attr.includes('(PK)') && <span className="text-xs text-blue-500">🔑</span>}
              {attr.includes('(FK)') && <span className="text-xs text-green-500">🔗</span>}
              <button
                className="ml-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="Delete field"
                onClick={() => handleDelete(index)}
                tabIndex={-1}
                type="button"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="ghost" className="mt-2 w-full text-xs add-field-btn" onClick={handleAdd} type="button">
          + Add Field
        </Button>
      </div>
      {/* Handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  );
};

export default memo(EntityNode);
