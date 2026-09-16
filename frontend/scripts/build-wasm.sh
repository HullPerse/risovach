#!/usr/bin/env bash

# Собирает ядро рисования в WebAssembly и кладёт обвязку в src/wasm/drawing.
# Артефакт не хранится в репозитории: он выводится из Rust-исходников и
# пересобирается этой командой.
#
# Цель `web` выбрана намеренно: обвязка сама подтягивает файл .wasm по адресу
# рядом с собой, поэтому сборщику не нужно ничего знать про формат модулей
# WebAssembly. `bundler` потребовал бы отдельного плагина, а он здесь лишний.

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="$root/src/wasm/drawing"

for tool in cargo wasm-bindgen; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Не найден $tool." >&2
    echo "Нужны rustup с target wasm32-unknown-unknown и wasm-bindgen-cli:" >&2
    echo "  rustup target add wasm32-unknown-unknown" >&2
    echo "  cargo install wasm-bindgen-cli" >&2
    exit 1
  fi
done

cd "$root/engine"

cargo build --release --target wasm32-unknown-unknown -p drawing-wasm

rm -rf "$out_dir"
mkdir -p "$out_dir"

wasm-bindgen \
  --target web \
  --out-dir "$out_dir" \
  --out-name drawing_engine \
  target/wasm32-unknown-unknown/release/drawing_wasm.wasm

echo "Обвязка движка: $out_dir"
