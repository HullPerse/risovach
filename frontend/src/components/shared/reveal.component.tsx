import { useState } from "react";

import { Button } from "@/components/ui/button.component";
import { ApiError } from "@/config/api.config";

const getErrorSummary = (error: Error): string => {
  const statusMap: Record<number, string> = {
    400: "Неверный запрос",
    401: "Неверные данные",
    404: "Не найдено",
    409: "Имя пользователя уже занято",
    429: "Слишком много запросов",
    500: "Ошибка сервера",
  };

  if (error instanceof ApiError) return statusMap[error.status];
  else return "Ошибка";
};

const RevealableError = ({ error }: { error: Error }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="link"
        className="text-error h-auto justify-start p-0 text-xs"
        onClick={() => setOpen((prev) => !prev)}
      >
        {getErrorSummary(error)}
      </Button>
      {open ? (
        <span className="text-muted text-xs break-all">{error.message}</span>
      ) : null}
    </div>
  );
};

export default RevealableError;
