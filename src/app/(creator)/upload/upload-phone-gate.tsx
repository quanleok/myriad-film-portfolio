"use client";

import { useRouter } from "next/navigation";
import { PhoneVerification } from "@/components/auth/PhoneVerification";

export function UploadPhoneGate() {
  const router = useRouter();

  return (
    <PhoneVerification
      onVerified={() => {
        router.refresh();
      }}
    />
  );
}
