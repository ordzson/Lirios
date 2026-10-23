#!/usr/bin/env bash

set -euo pipefail

build_dir="${1:-dist/lirios/browser}"
assets_dir="${build_dir}/assets"

if [[ ! -d "${assets_dir}" ]]; then
  echo "Public assets directory is missing: ${assets_dir}" >&2
  exit 1
fi

mapfile -d '' forbidden_files < <(
  find "${build_dir}" -type f \
    \( -iname 'env' \
       -o -iname 'env2' \
       -o -iname '.env*' \
       -o -iname '*.pdf' \
       -o -iname '*.ppt' \
       -o -iname '*.pptx' \
       -o -iname '*.ods' \
       -o -iname '*.xls' \
       -o -iname '*.xlsx' \
       -o -iname '*.doc' \
       -o -iname '*.docx' \) \
    -print0
)

if (( ${#forbidden_files[@]} > 0 )); then
  echo "Build contains forbidden configuration or document files:" >&2
  printf ' - %s\n' "${forbidden_files[@]}" >&2
  exit 1
fi

mapfile -d '' public_assets < <(find "${assets_dir}" -type f -print0)

if (( ${#public_assets[@]} == 0 )); then
  echo "No public photographs were generated in ${assets_dir}" >&2
  exit 1
fi

unexpected=()
for asset_path in "${public_assets[@]}"; do
  if [[ "${asset_path}" == *.webp ]]; then
    continue
  fi

  if [[ "${asset_path}" == "${assets_dir}"/plates/*.png ]]; then
    continue
  fi

  if [[ "${asset_path}" == "${assets_dir}/brand/dumish.jpeg" || "${asset_path}" == "${assets_dir}/brand/dumish-white.svg" || "${asset_path}" == "${assets_dir}/brand/favicon.svg" ]]; then
    continue
  fi

  unexpected+=("${asset_path}")
done

if (( ${#unexpected[@]} > 0 )); then
  echo "Build contains files outside the public image allowlist:" >&2
  printf ' - %s\n' "${unexpected[@]}" >&2
  exit 1
fi

printf 'Verified %d allowlisted public photographs; no documents or configuration files were published.\n' "${#public_assets[@]}"
