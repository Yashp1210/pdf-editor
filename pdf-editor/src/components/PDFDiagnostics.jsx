import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Complete operator diagnostics - shows exactly what's in the PDF
 */
async function diagnosePdfOperators(page) {
  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();
  
  const diagnostics = {
    totalOperators: operatorList.fnArray.length,
    totalTextItems: textContent.items.length,
    colorOperators: [],
    textOperators: [],
    fontOperators: [],
    allOperators: [],
    operatorCounts: {},
  };
  
  // Map operator codes to names for readability
  const operatorNames = {
    [pdfjsLib.OPS.setFillRGBColor]: 'setFillRGBColor',
    [pdfjsLib.OPS.setStrokeRGBColor]: 'setStrokeRGBColor',
    [pdfjsLib.OPS.setFillGray]: 'setFillGray',
    [pdfjsLib.OPS.setStrokeGray]: 'setStrokeGray',
    [pdfjsLib.OPS.setFillColorSpace]: 'setFillColorSpace',
    [pdfjsLib.OPS.setStrokeColorSpace]: 'setStrokeColorSpace',
    [pdfjsLib.OPS.setFillColor]: 'setFillColor',
    [pdfjsLib.OPS.setStrokeColor]: 'setStrokeColor',
    [pdfjsLib.OPS.setFillColorN]: 'setFillColorN',
    [pdfjsLib.OPS.setStrokeColorN]: 'setStrokeColorN',
    [pdfjsLib.OPS.setDeviceGrayFill]: 'setDeviceGrayFill',
    [pdfjsLib.OPS.setDeviceRGBFill]: 'setDeviceRGBFill',
    [pdfjsLib.OPS.setDeviceCMYKFill]: 'setDeviceCMYKFill',
    [pdfjsLib.OPS.showText]: 'showText',
    [pdfjsLib.OPS.showSpacedText]: 'showSpacedText',
    [pdfjsLib.OPS.setFont]: 'setFont',
    [pdfjsLib.OPS.nextLine]: 'nextLine',
    [pdfjsLib.OPS.setTextMatrix]: 'setTextMatrix',
    [pdfjsLib.OPS.beginText]: 'beginText',
    [pdfjsLib.OPS.endText]: 'endText',
  };
  
  // Process operators
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];
    const name = operatorNames[fn] || `UNKNOWN_${fn}`;
    
    // Count operators
    diagnostics.operatorCounts[name] = (diagnostics.operatorCounts[name] || 0) + 1;
    
    // Categorize
    const op = {
      index: i,
      code: fn,
      name: name,
      args: args,
    };
    
    // Color-related operators
    if (name.includes('Color') || name.includes('RGB') || name.includes('Gray') || name.includes('CMYK')) {
      diagnostics.colorOperators.push(op);
    }
    
    // Text operators
    if (name.includes('Text') || name === 'showText' || name === 'showSpacedText') {
      diagnostics.textOperators.push(op);
    }
    
    // Font operators
    if (name === 'setFont') {
      diagnostics.fontOperators.push(op);
    }
    
    // All operators (first 200 for readability)
    if (i < 200) {
      diagnostics.allOperators.push(op);
    }
  }
  
  return { diagnostics, textContent };
}

function PDFDiagnostics({ pdfFile }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  
  useEffect(() => {
    if (!pdfFile) return;
    
    const runDiagnostics = async () => {
      try {
        setLoading(true);
        const pdfData = new Uint8Array(pdfFile).slice(0);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1); // First page
        
        const { diagnostics: diag, textContent: tc } = await diagnosePdfOperators(page);
        setDiagnostics(diag);
        setTextContent(tc);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    runDiagnostics();
  }, [pdfFile]);
  
  if (loading) {
    return <div className="p-4">Analyzing PDF...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }
  
  if (!diagnostics) {
    return <div className="p-4">No data</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-300">
      <h2 className="text-2xl font-bold mb-4">PDF Operator Diagnostics</h2>
      
      {/* Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold mb-2">Summary</h3>
        <p>Total Operators: <span className="font-mono font-bold">{diagnostics.totalOperators}</span></p>
        <p>Text Items: <span className="font-mono font-bold">{diagnostics.totalTextItems}</span></p>
        <p>Color Operators Found: <span className="font-mono font-bold">{diagnostics.colorOperators.length}</span></p>
        <p>Text Operators Found: <span className="font-mono font-bold">{diagnostics.textOperators.length}</span></p>
        <p>Font Operators Found: <span className="font-mono font-bold">{diagnostics.fontOperators.length}</span></p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {['summary', 'colors', 'text', 'fonts', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm">
        
        {activeTab === 'summary' && (
          <div>
            <h4 className="font-bold mb-2">Operator Type Counts</h4>
            {Object.entries(diagnostics.operatorCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <div key={name} className="flex justify-between py-1 border-b border-gray-300">
                  <span>{name}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            }
            
            <h4 className="font-bold mt-4 mb-2">Key Findings</h4>
            {diagnostics.colorOperators.length === 0 && (
              <div className="text-orange-600 font-bold">
                ⚠️ NO COLOR OPERATORS FOUND
                <p className="text-xs mt-2">This PDF likely contains only black text with no explicit color changes in the operator stream.</p>
              </div>
            )}
            {diagnostics.colorOperators.length > 0 && (
              <div className="text-green-600 font-bold">
                ✓ Found {diagnostics.colorOperators.length} color operators
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'colors' && (
          <div>
            <h4 className="font-bold mb-2">Color Operators</h4>
            {diagnostics.colorOperators.length === 0 ? (
              <p className="text-orange-600 font-bold">No color operators found in this PDF</p>
            ) : (
              diagnostics.colorOperators.map((op, idx) => (
                <div key={idx} className="mb-3 p-2 bg-white border border-gray-300 rounded">
                  <div className="font-bold">[{op.index}] {op.name}</div>
                  <div className="text-xs text-gray-600">
                    Args: {JSON.stringify(op.args)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'text' && (
          <div>
            <h4 className="font-bold mb-2">Text Operators (first 50)</h4>
            {diagnostics.textOperators.slice(0, 50).map((op, idx) => (
              <div key={idx} className="mb-2 p-2 bg-white border border-gray-300 rounded">
                <div className="font-bold">[{op.index}] {op.name}</div>
                {op.args && op.args.length > 0 && (
                  <div className="text-xs text-gray-600">
                    Args: {JSON.stringify(op.args).substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'fonts' && (
          <div>
            <h4 className="font-bold mb-2">Font Operators</h4>
            {diagnostics.fontOperators.length === 0 ? (
              <p className="text-orange-600">No font operators found</p>
            ) : (
              diagnostics.fontOperators.map((op, idx) => (
                <div key={idx} className="mb-2 p-2 bg-white border border-gray-300 rounded">
                  <div className="font-bold">[{op.index}] {op.name}</div>
                  <div className="text-xs text-gray-600">
                    Args: {JSON.stringify(op.args)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'all' && (
          <div>
            <h4 className="font-bold mb-2">All Operators (first 200)</h4>
            {diagnostics.allOperators.map((op, idx) => (
              <div key={idx} className="mb-1 p-1">
                <span className="text-gray-600">[{op.index}]</span> {op.name}
                {op.args && op.args.length > 0 && (
                  <span className="text-xs text-gray-500"> {JSON.stringify(op.args).substring(0, 60)}...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Text Items Analysis */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-300">
        <h4 className="font-bold mb-2">First 5 Text Items</h4>
        {textContent && textContent.items.slice(0, 5).map((item, idx) => (
          <div key={idx} className="mb-2 p-2 bg-white rounded border border-yellow-200 font-mono text-sm">
            <div>Text: "{item.str}"</div>
            <div>Font: {item.fontName}</div>
            <div>Transform: [{item.transform.map(v => v.toFixed(2)).join(', ')}]</div>
            <div>Width: {item.width.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PDFDiagnostics;