import { Input } from "@/components/ui/input.component";

export const AuthField = ({
  id,
  label,
  type,
  value,
  onChange,
  autoFocus = false,
  amount = false,
}: {
  id: string;
  label: string;
  type: "text" | "password";
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  amount?: boolean;
}) => (
  <div className="flex w-full flex-col leading-tight">
    <label htmlFor={id} className="text-muted text-xs">
      {label}
    </label>
    <Input
      id={id}
      type={type}
      min={4}
      max={24}
      amount={amount}
      value={value}
      onChange={(e) => onChange(e.target.value.replaceAll(/\s+/gu, ""))}
      autoFocus={autoFocus}
    />
  </div>
);
