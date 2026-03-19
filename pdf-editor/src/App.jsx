import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import PDFViewer from './components/PDFViewer';
import DownloadButton from './components/DownloadButton';
import { FileText, Sparkles } from 'lucide-react';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for inline text updates from PDFViewer
  useEffect(() => {
    const handleUpdateText = (event) => {
      const { id, text, textItem } = event.detail;
      handleTextUpdate(id, text, textItem);
    };

    window.addEventListener('updateText', handleUpdateText);
    return () => window.removeEventListener('updateText', handleUpdateText);
  }, []);

  const handleFileUpload = async (file) => {
    setPdfFile(file);
    const arrayBuffer = await file.arrayBuffer();
    setPdfArrayBuffer(arrayBuffer);
    setEditedTexts({});
    setRefreshKey(prev => prev + 1);
  };

  const handleTextUpdate = (textId, newText, textItem) => {
    setEditedTexts(prev => {
      const updateData = {
        text: newText,
        color: textItem?.textColorCSS || 'rgb(0, 0, 0)',
        colorArray: textItem?.textColor || [0, 0, 0],
      };
      
      return {
        ...prev,
        [textId]: updateData
      };
    });
    
    setRefreshKey(prev => prev + 1);
  };

  const handleReset = () => {
    setPdfFile(null);
    setPdfArrayBuffer(null);
    setEditedTexts({});
    setRefreshKey(0);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              PDF Editor
            </h1>
            <Sparkles className="w-6 h-6 text-indigo-500" />
          </div>
          <p className="text-gray-600 text-lg">
            Click on any text to edit it directly - colors are preserved!
          </p>
        </div>

        {!pdfFile ? (
          <FileUpload onFileUpload={handleFileUpload} />
        ) : (
          <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {pdfFile.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Click on any text to edit it directly on the PDF
                  </p>
                </div>
                <div className="flex gap-3">
                  <DownloadButton
                    originalPdfBuffer={pdfArrayBuffer}
                    editedTexts={editedTexts}
                    fileName={pdfFile.name}
                  />
                  <button
                    onClick={handleReset}
                    className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200"
                  >
                    Upload New PDF
                  </button>
                </div>
              </div>
            </div>

            {/* PDF Viewer - Full Width with Inline Editing */}
            <div>
              <PDFViewer
                key={refreshKey}
                pdfFile={pdfArrayBuffer}
                editedTexts={editedTexts}
              />
            </div>

            {/* Edit Info */}
            {Object.keys(editedTexts).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">✅</span>
                  <h3 className="font-semibold text-green-900 text-lg">
                    {Object.keys(editedTexts).length} edit{Object.keys(editedTexts).length !== 1 ? 's' : ''} made
                  </h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(editedTexts).map(([id, data]) => (
                    <div key={id} className="text-sm text-green-800">
                      <span className="font-medium">
                        {typeof data === 'object' ? data.text : data}
                      </span>
                      {typeof data === 'object' && data.color && (
                        <span 
                          className="ml-2 inline-block px-2 py-1 rounded text-xs text-white"
                          style={{ backgroundColor: data.color }}
                          title={`Stored color: ${data.color}`}
                        >
                          Color: {data.color}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>✨ All processing happens in your browser - your files never leave your device</p>
        </div>
      </div>
    </div>
  );
}

export default App;