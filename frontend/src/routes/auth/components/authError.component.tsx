import RevealableError from "@/components/shared/reveal.component";

export const AuthError = ({
  validationError,
  error,
}: {
  validationError: string | null;
  error: Error | null;
}) => {
  if (validationError) {
    return <span className="text-error text-xs">{validationError}</span>;
  }

  if (error) return <RevealableError error={error} />;
  return null;
};
