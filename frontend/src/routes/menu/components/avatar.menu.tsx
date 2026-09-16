import { Blobatar } from "@blobatar/react";

import { UserApi } from "@/api/user.api";

import "blobatar/motion.css";
import ImageComponent from "@/components/shared/image.component";
import { useUserStore } from "@/stores/user.store";

export default function MenuAvatar() {
  const user = useUserStore((state) => state.user);
  if (!user) return;

  const avatar = UserApi.avatarUrl(user, "thumb");
  if (!avatar) return <Blobatar name={user.username} />;

  return (
    <ImageComponent
      src={avatar}
      alt="profile"
      className="border-border boxShadowSmall bg-card absolute top-1/2 left-2 size-6 -translate-y-1/2 border-2"
    />
  );
}
