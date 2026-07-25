"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Undo, 
  Redo 
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
    ],
    content: contentHtml,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[320px] p-4 text-slate-800 leading-relaxed",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-emerald-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-2 border-b border-slate-200 text-slate-700">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive("bold") ? "bg-emerald-100 text-emerald-800 font-bold" : ""
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive("italic") ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive("heading", { level: 2 }) ? "bg-emerald-100 text-emerald-800 font-bold" : ""
            }`}
            title="Heading 2"
          >
            <Heading1 size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive("heading", { level: 3 }) ? "bg-emerald-100 text-emerald-800 font-bold" : ""
            }`}
            title="Heading 3"
          >
            <Heading2 size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive("bulletList") ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Bullet List"
          >
            <List size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
              editor.isActive("orderedList") ? "bg-emerald-100 text-emerald-800" : ""
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
            title="Undo"
          >
            <Undo size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"
            title="Redo"
          >
            <Redo size={16} />
          </button>
        </div>
      )}

      {/* Editor Main Surface */}
      <EditorContent editor={editor} />
    </div>
  );
}