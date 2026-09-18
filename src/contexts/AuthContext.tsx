"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type FullProfile = Database["public"]["Tables"]["profiles"]["Row"];
type Profile = Pick<FullProfile, "id" | "display_name" | "username" | "avatar_url" | "is_creator" | "is_admin">;

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isCreator: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isCreator: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, is_creator, is_admin")
          .eq("id", currentUser.id)
          .single();
        setProfile(data);
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (!newUser) {
        setProfile(null);
        return;
      }
      supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, is_creator, is_admin")
        .eq("id", newUser.id)
        .single()
        .then(({ data }) => setProfile(data));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isCreator: profile?.is_creator ?? false, isAdmin: profile?.is_admin ?? false }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
