import { useRef, useState } from "react";
import type { ImgHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/index.utils";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  type?: "cover" | "contain";
}

const isExternal = (url: string) =>
  url.startsWith("http") ||
  url.startsWith("ftp") ||
  url.startsWith("data:") ||
  url.startsWith("blob:");

const Image = ({
  src,
  alt,
  className,
  width,
  height,
  type = "cover",
  quality = 80,
  ...props
}: ImageProps) => {
  const [attempt, setAttempt] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (prevSrc !== src) {
    setPrevSrc(src);
    setAttempt(0);
    setIsLoaded(false);
  }

  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setAttempt((count) => count + 1);
  };

  const showWebp = !isExternal(src) && !/\.(?:ico|svg)$/iu.test(src);
  const webpSrc = showWebp
    ? `${src.split("?")[0]}?format=webp&quality=${quality}`
    : src;

  const imageClassName = cn(
    "absolute inset-0 h-full w-full transition-opacity duration-300",
    type === "cover" ? "object-cover" : "object-contain",
    isLoaded ? "opacity-100" : "opacity-0"
  );

  const imageElement = (key: number) => (
    <img
      key={key}
      ref={imgRef}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={imageClassName}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );

  let content: ReactNode = null;

  if (attempt > 2) {
    content = (
      <div
        className="border-primary/20 bg-background/40 flex h-full w-full items-center justify-center border"
        role="presentation"
        aria-hidden="true"
      >
        <span className="text-muted-foreground text-xs">Изображение</span>
      </div>
    );
  } else if (showWebp) {
    content = (
      <picture key={attempt}>
        <source srcSet={webpSrc} type="image/webp" />
        {imageElement(attempt)}
      </picture>
    );
  } else {
    content = imageElement(attempt);
  }

  return (
    <div
      className={cn(
        "relative flex w-full items-center overflow-hidden",
        className
      )}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    >
      {content}
    </div>
  );
};

export default Image;
