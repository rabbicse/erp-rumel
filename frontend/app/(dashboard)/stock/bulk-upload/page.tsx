"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { stockApi } from "@/lib/api";
import { parseCSVLine } from "@/lib/utils";
import {
  Upload, FileText, CheckCircle, XCircle, TriangleAlert,
  Download, ArrowLeft, Loader2
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const CSV_HEADERS = [
  "product_name", "category", "stock_type", "metal_purity", "carat_weight",
  "cost_price", "retail_price", "customer_name", "supplier_name", "description"
];

interface ParsedRow {
  row: number;
  data: Record<string, string>;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line, i) => {
    const values = parseCSVLine(line);
    const data: Record<string, string> = {};
    headers.forEach((h, idx) => { data[h] = values[idx] ?? ""; });
    const errors: string[] = [];
    if (!data.product_name) errors.push("product_name is required");
    if (!data.category) errors.push("category is required");
    if (!data.cost_price || isNaN(Number(data.cost_price))) errors.push("cost_price must be a number");
    return { row: i + 2, data, errors };
  });
}

export default function BulkUploadPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filename, setFilename] = useState("");
  const [rawFile, setRawFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => stockApi.bulkUpload(file),
    onSuccess: (result) => {
      toast.success(`Uploaded ${result.imported} items successfully`);
    },
    onError: () => toast.error("Upload failed. Check the CSV format."),
  });

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setRawFile(file);
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    maxFiles: 1,
  });

  function downloadTemplate() {
    const csv = CSV_HEADERS.join(",") + "\n" +
      "Diamond Ring,rings,BD,18k,3.5,1200,2400,John Smith,Supplier Co,Beautiful ring\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  const errorRows = rows.filter((r) => r.errors.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/stock" className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Bulk Upload</h1>
          <p className="text-surface-400 text-sm">Upload multiple stock items via CSV</p>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Download Template
        </button>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragActive
            ? "border-purple-500 bg-purple-500/10"
            : "border-surface-600 hover:border-surface-500 bg-surface-800/50"}`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? "text-purple-400" : "text-surface-500"}`} />
        {isDragActive ? (
          <p className="text-purple-300 font-medium">Drop the CSV here…</p>
        ) : (
          <>
            <p className="text-surface-300 font-medium">Drag & drop a CSV file, or click to browse</p>
            <p className="text-surface-500 text-sm mt-1">Supports .csv files only</p>
          </>
        )}
      </div>

      {/* Validation Summary */}
      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-surface-400" />
                <span className="text-2xl font-bold text-white">{rows.length}</span>
              </div>
              <p className="text-surface-400 text-sm">Total Rows</p>
            </div>
            <div className="card text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-2xl font-bold text-green-400">{validRows.length}</span>
              </div>
              <p className="text-surface-400 text-sm">Valid</p>
            </div>
            <div className="card text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-2xl font-bold text-red-400">{errorRows.length}</span>
              </div>
              <p className="text-surface-400 text-sm">Errors</p>
            </div>
          </div>

          {/* Error rows */}
          {errorRows.length > 0 && (
            <div className="card border-red-800/30">
              <div className="flex items-center gap-2 mb-4">
                <TriangleAlert className="w-4 h-4 text-red-400" />
                <h3 className="font-semibold text-white">Rows with errors</h3>
              </div>
              <div className="space-y-2">
                {errorRows.slice(0, 10).map((r) => (
                  <div key={r.row} className="flex items-start gap-3 text-sm">
                    <span className="text-surface-400 w-16 shrink-0">Row {r.row}</span>
                    <div className="text-red-300">{r.errors.join(", ")}</div>
                  </div>
                ))}
                {errorRows.length > 10 && (
                  <p className="text-surface-500 text-sm">…and {errorRows.length - 10} more errors</p>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {validRows.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Preview (first 5 valid rows)</h3>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      {CSV_HEADERS.slice(0, 6).map((h) => (
                        <th key={h}>{h.replace(/_/g, " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 5).map((r) => (
                      <tr key={r.row}>
                        {CSV_HEADERS.slice(0, 6).map((h) => (
                          <td key={h}>{r.data[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload button */}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setRows([]); setFilename(""); setRawFile(null); }} className="btn-secondary">
              Clear
            </button>
            <button
              onClick={() => rawFile && uploadMutation.mutate(rawFile)}
              disabled={validRows.length === 0 || uploadMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Upload {validRows.length} Item{validRows.length !== 1 ? "s" : ""}
            </button>
          </div>
        </>
      )}

      {/* Instructions */}
      <div className="card bg-surface-800/50">
        <h3 className="font-semibold text-white mb-3">CSV Format</h3>
        <p className="text-surface-400 text-sm mb-3">
          Your CSV must include a header row with the following columns (order doesn&apos;t matter):
        </p>
        <div className="flex flex-wrap gap-2">
          {CSV_HEADERS.map((h) => (
            <code key={h} className="px-2 py-1 bg-surface-700 rounded text-purple-300 text-xs font-mono">
              {h}
            </code>
          ))}
        </div>
        <div className="mt-4 text-surface-400 text-sm space-y-1">
          <p>• <strong className="text-surface-300">product_name</strong>, <strong className="text-surface-300">category</strong>, and <strong className="text-surface-300">cost_price</strong> are required</p>
          <p>• <strong className="text-surface-300">stock_type</strong>: BD (bought/sold), CR (consignment received), CC (consignment created)</p>
          <p>• <strong className="text-surface-300">metal_purity</strong>: 9k, 14k, 18k, 22k, 24k, platinum, palladium, silver</p>
          <p>• Prices should be in GBP (numbers only, no £ symbol)</p>
        </div>
      </div>
    </div>
  );
}
