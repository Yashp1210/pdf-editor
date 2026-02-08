import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import PDFViewer from './components/PDFViewer';
import TextEditor from './components/TextEditor';
import DownloadButton from './components/DownloadButton';
import { FileText, Sparkles } from 'lucide-react';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [allTextItems, setAllTextItems] = useState([]);

  // Listen for inline text updates from PDFViewer
  useEffect(() => {
    const handleUpdateText = (event) => {
      const { id, text } = event.detail;
      handleTextUpdate(id, text);
    };

    window.addEventListener('updateText', handleUpdateText);
    return () => window.removeEventListener('updateText', handleUpdateText);
  }, []);

  const handleFileUpload = async (file) => {
    setPdfFile(file);
    const arrayBuffer = await file.arrayBuffer();
    setPdfArrayBuffer(arrayBuffer);
    setEditedTexts({});
    setSelectedText(null);
    setAllTextItems([]);
    setRefreshKey(prev => prev + 1);
  };

  const handleTextSelect = (textData) => {
    setSelectedText(textData);
  };

  const handleTextItemsLoaded = (items) => {
    setAllTextItems(items);
  };

  const handleTextUpdate = (textId, newText) => {
    setEditedTexts(prev => ({
      ...prev,
      [textId]: newText
    }));
    setRefreshKey(prev => prev + 1);
  };

  const handleReset = () => {
    setPdfFile(null);
    setPdfArrayBuffer(null);
    setSelectedText(null);
    setEditedTexts({});
    setAllTextItems([]);
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
            Edit any text in your PDF documents with ease
          </p>
        </div>

        {!pdfFile ? (
          <FileUpload onFileUpload={handleFileUpload} />
        ) : (
          <div className="space-y-6">
            {/* Control Panel */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {pdfFile.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Click on any text to edit it
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
                    className="btn-secondary"
                  >
                    Upload New PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PDF Viewer */}
              <div className="lg:col-span-2">
                <PDFViewer
                  key={refreshKey}
                  pdfFile={pdfArrayBuffer}
                  onTextSelect={handleTextSelect}
                  onTextItemsLoaded={handleTextItemsLoaded}
                  editedTexts={editedTexts}
                  selectedTextId={selectedText?.id}
                />
              </div>

              {/* Text Editor Sidebar */}
              <div className="lg:col-span-1">
                <TextEditor
                  selectedText={selectedText}
                  onTextUpdate={handleTextUpdate}
                  onTextSelect={handleTextSelect}
                  editedTexts={editedTexts}
                  allTextItems={allTextItems}
                />
              </div>
            </div>
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
