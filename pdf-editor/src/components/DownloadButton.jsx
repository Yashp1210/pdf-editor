import { Download, Loader, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { modifyPdfWithEdits } from '../utils/pdfEditor';

function DownloadButton({ originalPdfBuffer, editedTexts, fileName }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleDownload = async () => {
    if (Object.keys(editedTexts).length === 0) {
      alert('No changes to save. Please edit some text first.');
      return;
    }

    setIsProcessing(true);

    try {
      // Use utility function to modify PDF
      const pdfBytes = await modifyPdfWithEdits(originalPdfBuffer, editedTexts);
      
      // Create download link
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\.pdf$/i, '_edited.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Delay revocation to ensure the browser has time to initiate the download
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setIsProcessing(false);
    } catch (error) {
      console.error('Error creating edited PDF:', error);
      alert('Error creating edited PDF. Please try again.');
      setIsProcessing(false);
    }
  };

  const hasEdits = Object.keys(editedTexts).length > 0;

  return (
    <div className="relative">
      <button
        onClick={handleDownload}
        disabled={!hasEdits || isProcessing}
        className={`flex items-center gap-2 ${
          hasEdits && !isProcessing
            ? 'btn-primary'
            : 'bg-gray-300 text-gray-500 px-6 py-3 rounded-xl cursor-not-allowed'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Download ({Object.keys(editedTexts).length} edit{Object.keys(editedTexts).length !== 1 ? 's' : ''})
          </>
        )}
      </button>

      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute -right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        title="How it works"
      >
        <AlertCircle className="w-4 h-4" />
      </button>

      {showInfo && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border-2 border-blue-200 rounded-xl p-4 shadow-xl z-10">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-800">How editing works:</strong><br/>
            The editor covers old text with white rectangles and overlays your new text. This preserves the PDF structure while allowing edits. For best results, keep text similar in length to the original.
          </p>
          <button
            onClick={() => setShowInfo(false)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

export default DownloadButton;
