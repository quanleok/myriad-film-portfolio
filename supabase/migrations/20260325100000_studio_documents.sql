-- Add is_folder and parent_path columns to studio_documents (table already exists from chat_shell migration)
alter table public.studio_documents
  add column if not exists is_folder boolean not null default false,
  add column if not exists parent_path text;

-- Fast lookups by parent
create index if not exists studio_documents_parent on public.studio_documents(project_id, parent_path);
