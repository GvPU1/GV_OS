import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Heading1, Heading2, Code, Undo2, Redo2, } from "lucide-react";
import { cn } from "@/lib/utils";
export function RichEditor({ value, onChange, className }) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value || "",
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose-tight min-h-[280px] w-full max-w-none px-5 py-4 text-[14px] leading-relaxed outline-none focus:outline-none",
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });
    useEffect(() => {
        if (!editor)
            return;
        if (editor.getHTML() !== value)
            editor.commands.setContent(value || "", { emitUpdate: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);
    if (!editor)
        return null;
    const Btn = ({ onClick, active, children, label, }) => (<button type="button" aria-label={label} onClick={onClick} className={cn("grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground", active && "bg-accent text-accent-foreground")}>
      {children}
    </button>);
    return (<div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-2/40 px-2 py-1.5">
        <Btn label="H1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-3.5 w-3.5"/></Btn>
        <Btn label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5"/></Btn>
        <span className="mx-1 h-4 w-px bg-border"/>
        <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5"/></Btn>
        <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5"/></Btn>
        <Btn label="Strike" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-3.5 w-3.5"/></Btn>
        <Btn label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-3.5 w-3.5"/></Btn>
        <span className="mx-1 h-4 w-px bg-border"/>
        <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5"/></Btn>
        <Btn label="Ordered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5"/></Btn>
        <Btn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5"/></Btn>
        <span className="mx-1 h-4 w-px bg-border"/>
        <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-3.5 w-3.5"/></Btn>
        <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-3.5 w-3.5"/></Btn>
      </div>
      <EditorContent editor={editor}/>
    </div>);
}
