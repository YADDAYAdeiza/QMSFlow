"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

// Tiptap Extensions
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";

import { 
  Bold, 
  Italic, 
  Undo, 
  Redo,
  Table as TableIcon,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Rows,
  Columns,
  Plus,
  Minus
} from "lucide-react";

interface ReportRichTextEditorProps {
  contentHtml: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

export default function ReportRichTextEditor({
  contentHtml,
  onChange,
  readOnly = false,
}: ReportRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start typing or editing the compiled report narrative...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "tableCell", "tableHeader"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse border border-slate-700 my-4 w-full text-xs shadow-xs",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-slate-600 bg-slate-100 p-2 font-bold text-left",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-slate-600 p-2 align-top",
        },
      }),
    ],
    content: contentHtml,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[450px] p-6 text-slate-800 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-400 [&_td]:p-2 [&_th]:border [&_th]:border-slate-400 [&_th]:p-2",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-emerald-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-2 border-b border-slate-200 text-slate-700 text-xs">
          {/* Formatting Controls */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${
              editor.isActive("bold") ? "bg-emerald-100 text-emerald-800 font-bold" : ""
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${
              editor.isActive("italic") ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Alignment Controls */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${
              editor.isActive({ textAlign: "left" }) ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${
              editor.isActive({ textAlign: "center" }) ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${
              editor.isActive({ textAlign: "right" }) ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-1.5 rounded hover:bg-slate-200 ${
              editor.isActive({ textAlign: "justify" }) ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Justify Text"
          >
            <AlignJustify size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Insert Table */}
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded hover:bg-slate-200"
            title="Insert Table"
          >
            <TableIcon size={16} />
          </button>
          
          {/* Extended Table & Cell Controls */}
          {editor.isActive("table") && (
            <div className="flex items-center gap-1 bg-emerald-50/60 px-1.5 py-0.5 rounded border border-emerald-200">
              {/* Row Controls */}
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="px-1.5 py-1 hover:bg-emerald-100 text-[11px] flex items-center gap-0.5 rounded text-emerald-900"
                title="Add Row Above"
              >
                <Plus size={12} /><Rows size={12} /> Above
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="px-1.5 py-1 hover:bg-emerald-100 text-[11px] flex items-center gap-0.5 rounded text-emerald-900"
                title="Add Row Below"
              >
                <Plus size={12} /><Rows size={12} /> Below
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="px-1.5 py-1 hover:bg-rose-100 text-rose-700 text-[11px] flex items-center gap-0.5 rounded"
                title="Delete Row"
              >
                <Minus size={12} /><Rows size={12} /> Row
              </button>

              <div className="h-3 w-[1px] bg-emerald-300 mx-0.5" />

              {/* Column Controls */}
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="px-1.5 py-1 hover:bg-emerald-100 text-[11px] flex items-center gap-0.5 rounded text-emerald-900"
                title="Add Column Left"
              >
                <Plus size={12} /><Columns size={12} /> Left
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="px-1.5 py-1 hover:bg-emerald-100 text-[11px] flex items-center gap-0.5 rounded text-emerald-900"
                title="Add Column Right"
              >
                <Plus size={12} /><Columns size={12} /> Right
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="px-1.5 py-1 hover:bg-rose-100 text-rose-700 text-[11px] flex items-center gap-0.5 rounded"
                title="Delete Column"
              >
                <Minus size={12} /><Columns size={12} /> Col
              </button>

              <div className="h-3 w-[1px] bg-emerald-300 mx-0.5" />

              {/* Delete Entire Table */}
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Delete Entire Table"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
          >
            <Undo size={16} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
          >
            <Redo size={16} />
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}