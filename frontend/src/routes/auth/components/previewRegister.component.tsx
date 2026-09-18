import { useEffect, useMemo, useState } from "react";

import ImageComponent from "@/components/shared/image.component";
import LocationBadge from "@/components/shared/location.component";
import { Button } from "@/components/ui/button.component";
import { useGeoLocation } from "@/hooks/geo.hook";
import { useRegister } from "@/hooks/user/auth.hook";
import { registerSchema } from "@/lib/schemas/auth.schema";
import type { RegisterStep } from "@/types/app/auth";

import { AuthError } from "./authError.component";
import { AuthField } from "./authField.component";

const PreviewRegister = ({
  setCurrentTab,
  username,
  avatarFile,
  password,
}: {
  setCurrentTab: (value: RegisterStep) => void;
  username: string;
  avatarFile: File | null;
  password: string;
}) => {
  const register = useRegister();
  const { forceUnknown, retry, state: geoState } = useGeoLocation();
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suppressLocation, setSuppressLocation] = useState<boolean>(false);

  const avatarUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  const handleRegister = () => {
    setValidationError(null);
    const result = registerSchema.safeParse({
      avatar: avatarFile,
      confirmPassword,
      password,
      username,
    });
    if (!result.success) {
      return setValidationError(
        result.error.issues[0]?.message ?? "Проверьте введённые данные"
      );
    }

    const { username: name, password: pass, avatar } = result.data;

    register.mutate({
      avatar,
      password: pass,
      username: name,
      ...(!suppressLocation && geoState.status === "detected"
        ? { city: geoState.city, country: geoState.countryCode }
        : {}),
    });
  };

  return (
    <form
      className="flex w-full flex-col items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleRegister();
      }}
    >
      <section className="flex w-full flex-row gap-1">
        <div className="flex">
          <div className="border-border boxShadowSmall size-24 overflow-hidden border-2 bg-white">
            {avatarUrl && (
              <ImageComponent
                src={avatarUrl}
                alt="Аватар"
                className="size-full object-cover"
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span>@{username}</span>
          <div className="bg-muted h-1 w-full" />
        </div>
      </section>

      <LocationBadge
        geo={geoState}
        suppressLocation={suppressLocation}
        onRetry={() => retry()}
        onSuppressLocationChange={(suppressed) => {
          setSuppressLocation(suppressed);
          if (suppressed) forceUnknown();
        }}
      />

      <AuthField
        id="preview-confirm-password"
        label="Подтвердите пароль"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />

      <section className="flex w-full flex-row items-center gap-2">
        <Button
          type="button"
          variant="error"
          onClick={() => setCurrentTab("canvas")}
        >
          Назад
        </Button>
        <Button
          type="submit"
          variant="success"
          className="flex-1"
          loading={register.isPending}
          disabled={!avatarFile || !password || confirmPassword !== password}
        >
          Создать аккаунт
        </Button>
      </section>
      <AuthError validationError={validationError} error={register.error} />
    </form>
  );
};

export default PreviewRegister;
