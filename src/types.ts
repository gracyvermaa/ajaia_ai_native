import type { JSONContent } from '@tiptap/react'

export type DocumentRecord = {
  id: string
  title: string
  content_json: JSONContent
  owner_id: string
  created_at: string
  updated_at: string
}

export type DocumentPerson = {
  user_id: string
  email: string
  permission: 'owner' | 'editor' | 'viewer'
  is_owner: boolean
}

export type DocumentView = 'mine' | 'shared' | 'recent'
