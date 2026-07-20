export function SmallLoader() {
  return (
    <main className="flex flex-row gap-1 items-center justify-center">
      <div
        className="w-4 h-4 bg-primary border-2 border-border animate-bounce"
        style={{ animationDelay: "0.2s" }}
      />
      <div
        className="w-4 h-4 bg-secondary border-2 border-border animate-bounce"
        style={{ animationDelay: "0.4s" }}
      />
      <div
        className="w-4 h-4 bg-success border-2 border-border animate-bounce"
        style={{ animationDelay: "0.6s" }}
      />
    </main>
  );
}
export function WindowLoader() {
  return <></>;
}
export function BigLoader() {
  return <></>;
}
