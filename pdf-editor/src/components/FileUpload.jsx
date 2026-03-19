import { Upload, FileText } from 'lucide-react';
import { useState } from 'react';

const MAX_FILE_SIZE_MB = 50;

function validatePdfFile(file) {
  if (!file) return null;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return 'Please upload a PDF file.';
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

function FileUpload({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    const error = validatePdfFile(file);
    if (error) {
      alert(error);
    } else {
      onFileUpload(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    // User cancelled the picker — no file chosen, do nothing
    if (!file) return;
    const error = validatePdfFile(file);
    if (error) {
      alert(error);
      // Reset the input so the same file can trigger onChange again if needed
      e.target.value = '';
    } else {
      onFileUpload(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`glass-card rounded-3xl p-12 border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-105'
            : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-xl">
            {isDragging ? (
              <FileText className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <Upload className="w-10 h-10 text-white" />
            )}
          </div>
          
          <h2 className="text-2xl font-display font-bold text-gray-800 mb-3">
            Upload Your PDF
          </h2>
          
          <p className="text-gray-600 mb-8 text-lg">
            Drag and drop your PDF here, or click to browse
          </p>

          <label className="btn-primary cursor-pointer inline-block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            Choose PDF File
          </label>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>100% Client-Side</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span>Free Forever</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-sm font-medium text-gray-700">Lightning Fast</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-3xl mb-2">🔒</div>
          <p className="text-sm font-medium text-gray-700">Privacy First</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-sm font-medium text-gray-700">Easy to Use</p>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
