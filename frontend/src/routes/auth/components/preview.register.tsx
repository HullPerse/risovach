import { useState } from "react";

import LocationBadge from "@/components/shared/location-badge.component";
import ImageComponent from "@/components/shared/image.component";
import RevealableError from "@/components/shared/reveal.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useGeoLocation } from "@/hooks/geo.hook";
import { useRegister } from "@/hooks/user/auth.hook";
import { registerSchema } from "@/lib/zod.utils";

const PreviewRegister = ({
  setCurrentTab,
  username,
  avatarFile,
  password,
  confirmPassword,
  setConfirmPassword,
}: {
  setCurrentTab: (value: "data" | "canvas" | "preview") => void;
  username: string;
  avatarFile: File | null;
  password: string;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
}) => {
  const register = useRegister();
  const { forceUnknown, retry, state: geoState } = useGeoLocation();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suppressLocation, setSuppressLocation] = useState(false);
  const avatarUrl = avatarFile ? URL.createObjectURL(avatarFile) : null;

  const handleRegister = () => {
    setValidationError(null);
    const result = registerSchema.safeParse({
      avatar: avatarFile,
      confirmPassword,
      password,
      username,
    });
    if (!result.success) {
      setValidationError(
        result.error.issues[0]?.message ?? "Проверьте введённые данные"
      );
      return;
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

  let errorContent: React.ReactNode = null;
  if (validationError) {
    errorContent = (
      <span className="text-error text-xs">{validationError}</span>
    );
  } else if (register.error) {
    errorContent = <RevealableError error={register.error} />;
  }

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
            {avatarUrl ? (
              <ImageComponent
                src={avatarUrl}
                alt="Аватар"
                className="size-full object-cover"
              />
            ) : null}
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
        onRetry={() => {
          retry();
        }}
        onSuppressLocationChange={(suppressed) => {
          setSuppressLocation(suppressed);
          if (suppressed) forceUnknown();
        }}
      />

      <section className="flex w-full flex-col leading-tight">
        <label
          htmlFor="preview-confirm-password"
          className="text-muted text-xs"
        >
          Подтвердите пароль
        </label>
        <Input
          id="preview-confirm-password"
          type="password"
          min={4}
          max={24}
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value.replaceAll(/\s+/gu, ""))
          }
        />
      </section>

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
      {errorContent}
    </form>
  );
};

export default PreviewRegister;
