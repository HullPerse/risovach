import {
  Download,
  FolderOpen,
  RefreshCcw,
  RotateCcw,
  Save,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CanvasToolbar } from "@/components/canvas/components/toolbar.canvas";
import { DrawingCanvas } from "@/components/canvas/drawing.canvas";
import { Button } from "@/components/ui/button.component";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/modal.component";
import { PROJECT_EXTENSION } from "@/config/api.config";
import { DEFAULT_BRUSH } from "@/config/drawing.config";
import {
  drawingEngineVersion,
  loadDrawingEngine,
} from "@/engine/bridge/wasm.engine";
import { readProjectFile } from "@/engine/files/project.engine";
import { useCanvasTool } from "@/hooks/canvas/tool.hook";
import type { BrushSettings } from "@/types/engine/brush";
import type {
  DrawingCanvasAPI,
  DrawingCanvasState,
} from "@/types/engine/drawing";

const TEST_DIMENSIONS = { height: 1080, width: 1920 };

/** Hands a file to the browser as a download: a page has no other way. */
const download = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.download = file.name;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const TestPage = () => {
  const canvasApiRef = useRef<DrawingCanvasAPI | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { cancelTool, selectTool, tool } = useCanvasTool();
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(8);
  const [opacity, setOpacity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [canvasState, setCanvasState] = useState<DrawingCanvasState>({
    canRedo: false,
    canUndo: false,
    documentSize: TEST_DIMENSIONS,
    empty: true,
    error: null,
    zoom: 1,
  });

  // The module is only warmed up here so the header can show the core version:
  // the canvas below builds its own core from the same module instance.
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await loadDrawingEngine();
      } catch (error: unknown) {
        console.error("Drawing engine failed to load", error);
        return;
      }

      if (active) {
        setEngineVersion(drawingEngineVersion());
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const brush = useMemo<BrushSettings>(
    () => ({ ...DEFAULT_BRUSH, color, opacity, size }),
    [color, opacity, size]
  );

  const handleStateChange = useCallback((state: DrawingCanvasState) => {
    setCanvasState(state);
  }, []);

  // The canvas returns the tool after a colour pick; only the colour is here.
  const handleColorPick = (hex: string) => {
    setColor(hex);
  };

  const handleSaveImage = () => {
    setIsSaving(true);

    const save = async () => {
      const file = await canvasApiRef.current?.requestImage({
        filename: "canvas.png",
      });

      setIsSaving(false);

      if (file) {
        download(file);
      }
    };

    void save();
  };

  const handleSaveProject = () => {
    setProjectError(null);

    const file = canvasApiRef.current?.requestProject();

    if (file) {
      download(file);
    } else {
      setProjectError("Проект не собрался");
    }
  };

  const handleProjectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // The field is cleared at once, or the same file cannot be picked twice.
    event.target.value = "";

    if (!file) {
      return;
    }

    const open = async () => {
      const bytes = await readProjectFile(file);
      const opened = await canvasApiRef.current?.loadProject(bytes);

      if (!opened) {
        setProjectError("Файл не открылся: это не проект или он повреждён");
      }
    };

    setProjectError(null);
    void open();
  };

  const handleClear = () => {
    canvasApiRef.current?.clear();
    setShowClearConfirm(false);
  };

  return (
    <main className="pointer-events-auto flex h-full w-full flex-col gap-2 p-2">
      <section className="flex w-full flex-row items-center gap-2">
        <span className="text-muted text-[10px] font-bold tracking-widest uppercase">
          Test canvas {canvasState.documentSize.width}x
          {canvasState.documentSize.height}, zoom{" "}
          {Math.round(canvasState.zoom * 100)}%, core{" "}
          {engineVersion ?? "not loaded"}
        </span>

        {projectError ? (
          <span className="text-error text-[10px] font-bold tracking-widest uppercase">
            {projectError}
          </span>
        ) : null}

        <div className="ml-auto flex flex-row gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={`.${PROJECT_EXTENSION},application/octet-stream`}
            className="hidden"
            onChange={handleProjectFile}
          />
          <Button
            size="icon"
            className="size-9"
            onClick={() => canvasApiRef.current?.resetView()}
            title="Сбросить вид"
            aria-label="Сбросить вид"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="icon"
            className="size-9"
            onClick={() => setShowClearConfirm(true)}
            title="Очистить"
            aria-label="Очистить"
          >
            <RefreshCcw className="size-4" />
          </Button>
          <Button
            size="icon"
            className="size-9"
            onClick={() => fileRef.current?.click()}
            title="Открыть проект"
            aria-label="Открыть проект"
          >
            <FolderOpen className="size-4" />
          </Button>
          <Button onClick={handleSaveProject}>
            <Save className="size-4" />
            Сохранить проект
          </Button>
          <Button
            variant="success"
            loading={isSaving}
            onClick={handleSaveImage}
          >
            <Download className="size-4" />
            Сохранить PNG
          </Button>
        </div>
      </section>

      <div className="min-h-0 flex-1">
        <DrawingCanvas
          ref={canvasApiRef}
          brush={brush}
          documentSize={TEST_DIMENSIONS}
          tool={tool}
          onColorPick={handleColorPick}
          onStateChange={handleStateChange}
          onToolCancel={cancelTool}
          onToolChange={selectTool}
          className="h-full w-full"
        />
      </div>

      <CanvasToolbar
        tool={tool}
        onToolChange={selectTool}
        color={color}
        onColorChange={setColor}
        size={size}
        onSizeChange={setSize}
        opacity={opacity}
        onOpacityChange={setOpacity}
        onUndo={() => canvasApiRef.current?.undo()}
        onRedo={() => canvasApiRef.current?.redo()}
      />

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-72">
          <DialogHeader>
            <DialogTitle>Очистить холст?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
              Отмена
            </Button>
            <Button variant="error" onClick={handleClear}>
              Очистить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default TestPage;
