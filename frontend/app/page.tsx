"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EnterpriseLanding } from "./_landing/EnterpriseLanding";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Redirect authenticated users to dashboard immediately
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });

    // Also listen for auth events — catches OAuth redirects that land here
    // with a session in the URL hash (implicit flow fallback on iOS Safari)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) router.replace("/dashboard");
      },
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return <EnterpriseLanding />;
}
