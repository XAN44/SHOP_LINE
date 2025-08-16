import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function useLiff(liffId: string) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    liff.init({ liffId }).then(async () => {
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      console.log("LIFF is not logged in");
      const p = await liff.getProfile();
      console.log("Profile data:", p);
    });
  }, [liffId]);

  return profile;
}
