import { useState, useEffect } from 'react';
import { Edit3, Check, X, List, Search } from 'lucide-react';

function TextEditor({ selectedText, onTextUpdate, editedTexts, allTextItems, onTextSelect }) {
  const [editValue, setEditValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'edit'

  useEffect(() => {
    if (selectedText) {
      const currentValue = editedTexts[selectedText.id] !== undefined
        ? editedTexts[selectedText.id]
        : selectedText.text;
      setEditValue(currentValue);
      setIsEditing(true);
      setViewMode('edit');
    }
  }, [selectedText, editedTexts]);

  const handleSave = () => {
    if (selectedText) {
      onTextUpdate(selectedText.id, editValue);
      setIsEditing(false);
      setViewMode('list');
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setIsEditing(false);
  };

  const handleReset = () => {
    if (selectedText) {
      setEditValue(selectedText.text);
      onTextUpdate(selectedText.id, selectedText.text);
    }
  };

  const handleTextItemClick = (item) => {
    onTextSelect(item);
  };

  const filteredTextItems = allTextItems.filter(item =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges = selectedText && editedTexts[selectedText.id] !== undefined;

  return (
    <div className="glass-card rounded-2xl p-6 sticky top-6 max-h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800 text-lg">Text Editor</h3>
        </div>
        {viewMode === 'edit' && (
          <button
            onClick={() => setViewMode('list')}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <List className="w-4 h-4" />
            View All
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
            <span>{filteredTextItems.length} text items</span>
            <span>{Object.keys(editedTexts).length} edited</span>
          </div>

          {/* Text Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredTextItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No text items found
              </div>
            ) : (
              filteredTextItems.map((item) => {
                const isEdited = editedTexts[item.id] !== undefined;
                const displayText = isEdited ? editedTexts[item.id] : item.text;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleTextItemClick(item)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedText?.id === item.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-700 flex-1 line-clamp-2">
                        {displayText}
                      </p>
                      {isEdited && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <span>{Math.round(item.fontSize)}px</span>
                      <span>•</span>
                      <span className="truncate">{item.fontName}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Original Text */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Original Text
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                {selectedText.text}
              </div>
            </div>

            {/* Edit Input */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                New Text
              </label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg p-3 text-sm resize-none focus:outline-none transition-colors"
                rows={4}
                placeholder="Enter new text..."
                autoFocus
              />
            </div>

            {/* Text Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Font:</span>
                <span className="font-medium text-gray-800">{selectedText.fontName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Size:</span>
                <span className="font-medium text-gray-800">{Math.round(selectedText.fontSize)}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Position:</span>
                <span className="font-medium text-gray-800">
                  {Math.round(selectedText.x)}, {Math.round(selectedText.y)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>

            <div className="flex gap-2">
              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <X className="w-4 h-4" />
                  Reset
                </button>
              )}
              <button
                onClick={handleCancel}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextEditor;
