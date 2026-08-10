import { Popover } from "@base-ui/react/popover";

import { cn } from "@/lib/index.utils";
import type { ColorPickerProps } from "@/types/color";

import { ColorPickerPanel } from "./components/panel.picker";

export const ColorPicker = ({
  value,
  onChange,
  children,
  side = "bottom",
  align = "start",
}: ColorPickerProps) => (
  <Popover.Root>
    {children ? (
      <Popover.Trigger
        nativeButton={false}
        render={(props) => <span {...props}>{children}</span>}
      />
    ) : (
      <Popover.Trigger>
        <span
          aria-hidden
          className="border-border size-7 shrink-0 border-2"
          style={{ backgroundColor: value }}
        />
      </Popover.Trigger>
    )}

    <Popover.Portal>
      <Popover.Positioner
        side={side}
        align={align}
        sideOffset={10}
        collisionPadding={12}
        className="z-50 outline-none"
      >
        <Popover.Popup
          className={cn(
            "border-border bg-card text-text boxShadow w-72 origin-(--transform-origin) border-2 p-4",
            "transition-[transform,opacity] duration-150",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0"
          )}
        >
          <ColorPickerPanel value={value} onChange={onChange} />
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>
);
