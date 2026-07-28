export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  created_at: string
}

export interface Skill {
  id: string
  name: string
  category: string | null
}

export interface UserSkill {
  user_id: string
  skill_id: string
  proficiency: string
  skill?: Skill
}

export interface Project {
  id: string
  owner_id: string
  title: string
  tagline: string | null
  description: string
  status: 'seed' | 'growing' | 'launched' | 'archived'
  cover_image_url: string | null
  created_at: string
  updated_at: string
  owner?: Profile
  skills_needed?: ProjectSkillNeeded[]
  members?: ProjectMember[]
}

export interface ProjectSkillNeeded {
  project_id: string
  skill_id: string
  slots_open: number
  skill?: Skill
}

export interface Application {
  id: string
  project_id: string
  applicant_id: string
  skill_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  applicant?: Profile
  skill?: Skill
}

export interface ProjectMember {
  project_id: string
  user_id: string
  skill_id: string
  role: 'owner' | 'contributor'
  joined_at: string
  profile?: Profile
  skill?: Skill
}

export interface ProjectUpdate {
  id: string
  project_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export interface UserKey {
  user_id: string
  public_key: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  ciphertext: string
  iv: string
  ciphertext_self: string | null
  iv_self: string | null
  created_at: string
  read_at: string | null
  sender?: Profile
}

export interface Conversation {
  id: string
  user_a: string
  user_b: string
  created_at: string
}
