"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { trpc } from "@/shared/lib/trpc/client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogClose } from "@/shared/ui/dialog";
import { Field, Input, Select } from "@/shared/ui/input";

type CategoryRow = { id: string; name: string; parentId: string | null };
type FormValues = { name: string; parentId: string };

export function CategorySettings() {
  const utils = trpc.useUtils();
  const categories = trpc.budgeting.categories.useQuery();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => utils.budgeting.invalidate();

  const create = trpc.budgeting.createCategory.useMutation({
    onSuccess: async () => {
      setAddOpen(false);
      await invalidate();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const update = trpc.budgeting.updateCategory.useMutation({
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const remove = trpc.budgeting.deleteCategory.useMutation({
    onSuccess: invalidate,
    onError: (mutationError) => setError(mutationError.message),
  });

  const rows = categories.data ?? [];
  const roots = rows.filter((row) => row.parentId === null);
  const childrenOf = (id: string) => rows.filter((row) => row.parentId === id);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Add category
        </Button>
      </CardHeader>

      <CardContent>
        <p className="mb-5 max-w-prose text-sm text-foreground/60">
          Categories nest one level or more — a target on a parent counts
          everything spent under its children. Deleting a category keeps its
          transactions; they become uncategorised.
        </p>

        {error ? (
          <p className="mb-4 border border-negative px-4 py-2 text-xs text-negative">
            {error}
          </p>
        ) : null}

        {categories.isPending ? (
          <div className="h-24 w-full bg-foreground/5" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground/50">
            No categories yet — the Budget screen can create a starter set.
          </p>
        ) : (
          <ul className="text-sm">
            {roots.map((root) => (
              <li key={root.id}>
                <CategoryLine
                  row={root}
                  onEdit={setEditing}
                  onDelete={(id) => remove.mutate({ id })}
                />
                {childrenOf(root.id).map((child) => (
                  <CategoryLine
                    key={child.id}
                    row={child}
                    depth={1}
                    onEdit={setEditing}
                    onDelete={(id) => remove.mutate({ id })}
                  />
                ))}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add category">
          <CategoryForm
            categories={rows}
            isSubmitting={create.isPending}
            submitLabel="Add category"
            onSubmit={(values) => {
              setError(null);
              create.mutate(values);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent title="Edit category">
          {editing ? (
            <CategoryForm
              key={editing.id}
              categories={rows.filter((row) => row.id !== editing.id)}
              defaultValues={editing}
              isSubmitting={update.isPending}
              submitLabel="Save changes"
              onSubmit={(values) => {
                setError(null);
                update.mutate({ id: editing.id, ...values });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CategoryLine({
  row,
  depth = 0,
  onEdit,
  onDelete,
}: {
  row: CategoryRow;
  depth?: number;
  onEdit: (row: CategoryRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <span style={{ paddingLeft: `${depth * 20}px` }}>{row.name}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (
              window.confirm(
                `Delete "${row.name}"? Its transactions become uncategorised.`,
              )
            ) {
              onDelete(row.id);
            }
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function CategoryForm({
  categories,
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  categories: CategoryRow[];
  defaultValues?: CategoryRow;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: { name: string; parentId: string | null }) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      parentId: defaultValues?.parentId ?? "",
    },
  });

  // Only top-level categories are offered as parents, keeping the tree
  // shallow — Section 15's "nothing nested more than two levels deep".
  const parentOptions = categories.filter((row) => row.parentId === null);

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          name: values.name.trim(),
          parentId: values.parentId || null,
        }),
      )}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field label="Name" error={errors.name?.message}>
        <Input
          autoFocus
          {...register("name", { required: "Name is required" })}
        />
      </Field>

      <Field label="Parent category">
        <Select {...register("parentId")}>
          <option value="">None (top level)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
      </div>
    </form>
  );
}
