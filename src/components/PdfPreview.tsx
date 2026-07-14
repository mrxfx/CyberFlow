import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle, RefreshCw 
} from "lucide-react";

// Configure PDFjs worker using CDN matching the installed version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  fileData: string; // Base64 data URL
}

export default function PdfPreview({ fileData }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.85);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Reset page when fileData changes
  useEffect(() => {
    setPageNumber(1);
    setRenderError(null);
  }, [fileData]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setRenderError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error("PDF load error:", err);
    setRenderError("Failed to parse this document. It may be corrupted or in an incompatible format.");
  }

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.15, 2.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.15, 0.5));
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative" id="pdf-preview-container">
      {/* Top Toolbar Controls */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between z-10 shadow-xs">
        {/* Pagination controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={pageNumber <= 1}
            onClick={handlePrevPage}
            className="p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-semibold text-slate-700 min-w-[70px] text-center font-mono select-none">
            Page {pageNumber} of {numPages || "..."}
          </span>

          <button
            type="button"
            disabled={numPages === null || pageNumber >= numPages}
            onClick={handleNextPage}
            className="p-1.5 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={scale <= 0.5}
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] font-bold text-slate-500 font-mono min-w-[40px] text-center select-none">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            disabled={scale >= 2.0}
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-100 disabled:opacity-40 rounded-lg text-slate-600 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center min-h-[300px]">
        {renderError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-red-600 max-w-sm m-auto space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-xs font-semibold">{renderError}</p>
          </div>
        ) : (
          <Document
            file={fileData}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center gap-2 text-slate-500 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-xs font-medium font-mono">Synthesizing document canvas...</span>
              </div>
            }
            className="flex justify-center shadow-md bg-white rounded-lg overflow-hidden border border-slate-200"
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="flex items-center justify-center py-16 px-24 bg-white">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              }
            />
          </Document>
        )}
      </div>
    </div>
  );
}
