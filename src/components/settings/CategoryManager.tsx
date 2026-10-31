"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionCard } from "@/components/ui/SectionCard";
import { Spinner } from "@/components/ui/Spinner";
import type { CategoryDTO } from "@/lib/types";
import { EMOJI_CHOICES, cn, hueColor } from "@/lib/ui";

/** Create, recolour, rename and remove habit categories. */
export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp();
  const [name, setName] = useState("");
  const [hue, setHue] = useState(285);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [editName, setEditName] = useState("");
  const [editHue, setEditHue] = useState(285);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const ok = await addCategory(name.trim(), hue);
    setAdding(false);
    if (ok) {
      setName("");
      setHue((current) => (current + 47) % 360);
    }
  };

  const startEdit = (category: CategoryDTO) => {
    setEditing(category);
    setEditName(category.name);
    setEditHue(category.hue);
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    const ok = await updateCategory(editing.id, editName.trim(), editHue);
    setSaving(false);
    if (ok) setEditing(null);
  };

  return (
    <SectionCard
      title="Categories"
      description="Group habits and tasks. Habit history survives when a category is removed."
      eyebrow="Organisation"
    >
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong px-3 py-5 text-center">
            <Tag className="mx-auto size-4 text-faint" />
            <p className="mt-1.5 text-xs text-muted">
              No categories yet. Try “Health”, “Learning” or “Home”.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-xl border border-line bg-surface-2/60 p-2"
              >
                {editing?.id === category.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: hueColor(editHue) }}
                      />
                      <input
                        className="input !min-h-8 !py-1 text-sm"
                        value={editName}
                        maxLength={60}
                        onChange={(event) => setEditName(event.target.value)}
                        aria-label={`Rename ${category.name}`}
                      />
                    </div>
                    <ColorPicker hue={editHue} onChange={setEditHue} compact label="Colour" />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing(null)}
                        disabled={saving}
                      >
                        <X className="size-3.5" /> Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={saveEdit}
                        disabled={saving || !editName.trim()}
                      >
                        {saving ? <Spinner size={13} /> : <Check className="size-3.5" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        background: hueColor(category.hue),
                        boxShadow: `0 0 8px ${hueColor(category.hue)}66`,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-soft">
                      {category.name}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm !size-7"
                      onClick={() => startEdit(category)}
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm !size-7 text-[var(--danger)]"
                      onClick={() => setDeleting(category)}
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="rounded-xl border border-line bg-surface-2/40 p-3">
          <p className="mb-2 text-xs font-semibold text-soft">Add a category</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span
                className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 rounded-full"
                style={{ background: hueColor(hue) }}
                aria-hidden="true"
              />
              <input
                className="input pl-7"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder={EMOJI_CHOICES[0] + " Category name"}
                aria-label="New category name"
              />
            </div>
            <button
              type="submit"
              className={cn("btn btn-primary", !name.trim() && "opacity-60")}
              disabled={adding || !name.trim()}
            >
              {adding ? <Spinner size={15} /> : <Plus className="size-4" />}
              Add
            </button>
          </div>
          <div className="mt-2">
            <ColorPicker hue={hue} onChange={setHue} compact label="Category colour" />
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this category?"
        message={`“${deleting?.name ?? "This category"}” will be removed. Its habits and tasks are kept and become uncategorised.`}
        confirmLabel="Delete category"
        onConfirm={async () => {
          if (deleting) await deleteCategory(deleting.id);
        }}
      />
    </SectionCard>
  );
}
