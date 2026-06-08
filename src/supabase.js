import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xnuatynoxnreesspqqdy.supabase.co'
const supabaseAnonKey = 'sb_publishable_Om92tguMXoad4RNMEYqv-g_6lX9k8C_'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
