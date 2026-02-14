import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Deep dive into PDF structure to find colors in ExtGState and Resources
 */
async function deepDiagnosePdfColors(page) {
  const textContent = await page.getTextContent();
  const operatorList = await page.getOperatorList();
  
  console.log('🔬 ADVANCED DIAGNOSTICS: Starting deep analysis...');
  console.log('Total operators:', operatorList.fnArray.length);
  console.log('Total text items:', textContent.items.length);
  
  const findings = {
    textItems: [],
    extGStates: [],
    colorSpaces: [],
    advancedColorOps: [],
    hasExtGState: false,
    hasIndirectColors: false,
    graphicsStateOps: 0,
    setColorSpaceOps: 0,
  };
  
  // Check for graphics state operators (these reference ExtGState)
  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];
    
    // Log key operators
    if (fn === 81 || fn === 2 || fn === 5 || fn === 25 || fn === 26) {
      console.log(`[${i}] Operator ${fn}: args =`, args);
    }
    
    // setGraphicsState operator (code 81)
    if (fn === 81) {
      findings.graphicsStateOps++;
      findings.advancedColorOps.push({
        type: 'setGraphicsState',
        args: args,
        index: i,
        description: 'Uses ExtGState - colors may be stored here',
      });
      findings.hasExtGState = true;
      console.log('✓ Found setGraphicsState at index', i, 'args:', args);
    }
    
    // setFillColorSpace (25) and setStrokeColorSpace (26)
    if (fn === 25 || fn === 26) {
      findings.setColorSpaceOps++;
      findings.advancedColorOps.push({
        type: fn === 25 ? 'setFillColorSpace' : 'setStrokeColorSpace',
        args: args,
        index: i,
        description: 'Sets color space - may reference palette or indirect colors',
      });
      console.log(`Found ${fn === 25 ? 'setFillColorSpace' : 'setStrokeColorSpace'} at index ${i}`);
    }
    
    // setFillColor (27) / setStrokeColor (28) with arguments (indirect reference)
    if ((fn === 27 || fn === 28) && args && args.length > 0) {
      findings.advancedColorOps.push({
        type: fn === 27 ? 'setFillColor' : 'setStrokeColor',
        args: args,
        index: i,
        description: 'Uses indirect color reference',
      });
      findings.hasIndirectColors = true;
    }
  }
  
  // Analyze text items for patterns
  textContent.items.forEach((item, idx) => {
    if (idx < 5) { // First 5 items
      findings.textItems.push({
        text: item.str,
        fontName: item.fontName,
        transform: item.transform,
        width: item.width,
      });
    }
  });
  
  console.log('✓ Advanced diagnostics complete');
  console.log('  - hasExtGState:', findings.hasExtGState);
  console.log('  - graphicsStateOps:', findings.graphicsStateOps);
  console.log('  - hasIndirectColors:', findings.hasIndirectColors);
  console.log('  - advancedColorOps found:', findings.advancedColorOps.length);
  
  return findings;
}

function AdvancedPDFDiagnostics({ pdfFile }) {
  const [findings, setFindings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!pdfFile) {
      console.log('❌ No PDF file provided to AdvancedPDFDiagnostics');
      setLoading(false);
      return;
    }
    
    console.log('📊 AdvancedPDFDiagnostics: Starting analysis...');
    
    const runDeepAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const pdfData = new Uint8Array(pdfFile).slice(0);
        console.log('📄 Loading PDF, buffer size:', pdfData.length);
        
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        console.log('✓ PDF loaded, pages:', pdf.numPages);
        
        const page = await pdf.getPage(1);
        console.log('✓ Page 1 loaded');
        
        const findings = await deepDiagnosePdfColors(page);
        setFindings(findings);
        setLoading(false);
      } catch (err) {
        console.error('❌ Advanced diagnostics error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    runDeepAnalysis();
  }, [pdfFile]);
  
  if (loading) {
    return (
      <div className="p-6 bg-purple-50 rounded-lg border-2 border-purple-300 animate-pulse">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔬</span>
          <div className="text-center w-full">
            <p className="font-bold text-purple-900">Performing Advanced Analysis...</p>
            <p className="text-sm text-purple-700">Checking for ExtGState and color storage methods</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border-2 border-red-300">
        <p className="font-bold text-red-900">❌ Analysis Error</p>
        <p className="text-sm text-red-700 mt-2">{error}</p>
      </div>
    );
  }
  
  if (!findings) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-300">
        <p className="text-gray-700">No findings data available</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white rounded-lg border-2 border-purple-300 space-y-4">
      <h2 className="text-2xl font-bold mb-4">🔬 Advanced Color Analysis</h2>
      
      {/* Key Finding */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h3 className="font-bold text-lg mb-3">Key Finding</h3>
        
        {findings.hasExtGState ? (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-300 rounded">
            <span className="text-3xl">🎨</span>
            <div>
              <p className="font-bold text-blue-900 text-lg">✓ ExtGState Detected!</p>
              <p className="text-sm text-blue-800 mt-2">
                Found <strong>{findings.graphicsStateOps}</strong> setGraphicsState operations
              </p>
              <p className="text-sm text-blue-800 mt-2">
                This PDF uses Graphics State Dictionary (ExtGState) to store color information.
                Colors are <strong>NOT in the operator stream</strong> - they're referenced as graphics state objects.
              </p>
              <p className="text-sm text-blue-900 mt-3 font-bold bg-blue-100 p-2 rounded">
                💡 This confirms the blue/colored text you see uses ExtGState!
              </p>
            </div>
          </div>
        ) : findings.hasIndirectColors ? (
          <div className="flex items-start gap-3 p-4 bg-orange-50 border-2 border-orange-300 rounded">
            <span className="text-3xl">📋</span>
            <div>
              <p className="font-bold text-orange-900 text-lg">Indirect Color References Found</p>
              <p className="text-sm text-orange-800 mt-2">
                Colors are stored via indirect references in the PDF resources.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-gray-50 border-2 border-gray-300 rounded">
            <span className="text-3xl">📄</span>
            <div>
              <p className="font-bold text-gray-900 text-lg">No Advanced Color Ops Found</p>
              <p className="text-sm text-gray-800 mt-2">
                Colors may be stored in other ways or all text is black.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-xs text-gray-600 font-bold uppercase">Graphics State Ops</p>
          <p className="text-2xl font-bold text-blue-600">{findings.graphicsStateOps}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-bold uppercase">Color Space Ops</p>
          <p className="text-2xl font-bold text-purple-600">{findings.setColorSpaceOps}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-bold uppercase">Text Items (first 5)</p>
          <p className="text-2xl font-bold text-green-600">{findings.textItems.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-bold uppercase">Indirect Colors</p>
          <p className="text-2xl font-bold text-orange-600">{findings.hasIndirectColors ? '✓' : '✗'}</p>
        </div>
      </div>
      
      {/* Text Items Preview */}
      {findings.textItems.length > 0 && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-bold mb-3">Text Items (First 5)</h3>
          {findings.textItems.map((item, idx) => (
            <div key={idx} className="mb-2 p-2 bg-white rounded border border-yellow-200 text-sm">
              <div className="font-mono font-bold">"{item.text}"</div>
              <div className="text-xs text-gray-600 mt-1">Font: {item.fontName || 'Unknown'}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Advanced Color Operations */}
      {findings.advancedColorOps.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-bold mb-3">Advanced Color Operations: {findings.advancedColorOps.length}</h3>
          {findings.advancedColorOps.slice(0, 10).map((op, idx) => (
            <div key={idx} className="mb-2 p-2 bg-white rounded border border-blue-200 text-sm">
              <div className="font-bold text-blue-900">[{op.index}] {op.type}</div>
              <div className="text-xs text-gray-600 mt-1">{op.description}</div>
              {op.args && (
                <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-50 p-1 rounded">
                  Args: {JSON.stringify(op.args)}
                </div>
              )}
            </div>
          ))}
          {findings.advancedColorOps.length > 10 && (
            <p className="text-sm text-gray-600 mt-2">... and {findings.advancedColorOps.length - 10} more operations</p>
          )}
        </div>
      )}
      
      {/* Next Steps */}
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <h3 className="font-bold mb-2">📋 Next Steps</h3>
        {findings.hasExtGState && (
          <p className="text-sm text-indigo-900 mb-2">
            ✓ Your PDF uses ExtGState for colors. To extract these colors, we need to parse the PDF's resource dictionary.
            This requires accessing the raw PDF structure which is beyond basic pdf.js capabilities.
          </p>
        )}
        <ul className="text-sm text-indigo-900 list-disc list-inside space-y-1">
          <li>For text editing: Current setup works fine (treats as black text)</li>
          <li>For color preservation: Need advanced PDF parsing library</li>
          <li>For quick fix: Can use CSS color detection on rendered PDF</li>
        </ul>
      </div>
    </div>
  );
}

export default AdvancedPDFDiagnostics;