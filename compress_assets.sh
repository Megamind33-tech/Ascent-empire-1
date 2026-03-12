#!/bin/bash

# Asset compression script for Phase 1
# Compresses 8 largest models using Draco compression

MODELS=(
  "public/assets/models/landmarks/birch_trees.glb"
  "public/assets/models/vehicles/car_model.glb"
  "public/assets/models/landmarks/Waterfall.glb"
  "public/assets/models/civic/school.glb"
  "public/assets/models/civic/hospital.glb"
  "public/assets/models/landmarks/palm_trees.glb"
  "public/assets/models/civic/cat_animated.glb"
  "public/assets/models/vehicles/nissan_gtr.glb"
)

echo "Starting compression of 8 largest models using Draco..."
echo ""

total_before=0
total_after=0

for model in "${MODELS[@]}"; do
  if [ -f "$model" ]; then
    before_bytes=$(stat -c%s "$model" 2>/dev/null)
    before_mb=$(echo "scale=1; $before_bytes / 1048576" | bc)
    
    # Create output path with _optimized suffix
    output="${model%.glb}_optimized.glb"
    
    echo "Compressing $(basename $model) ($before_mb MB)..."
    gltf-transform optimize "$model" "$output" --compress draco --simplify --texture-compress auto
    
    if [ -f "$output" ]; then
      after_bytes=$(stat -c%s "$output" 2>/dev/null)
      after_mb=$(echo "scale=1; $after_bytes / 1048576" | bc)
      reduction=$(( (before_bytes - after_bytes) * 100 / before_bytes ))
      echo "  ✓ Result: $after_mb MB (${reduction}% reduction)"
      total_before=$((total_before + before_bytes))
      total_after=$((total_after + after_bytes))
    fi
    echo ""
  fi
done

echo "Compression complete!"
total_before_mb=$(echo "scale=1; $total_before / 1048576" | bc)
total_after_mb=$(echo "scale=1; $total_after / 1048576" | bc)
echo "Total before: $total_before_mb MB"
echo "Total after: $total_after_mb MB"
if [ $total_before -gt 0 ]; then
  total_reduction=$(( (total_before - total_after) * 100 / total_before ))
  echo "Total reduction: ${total_reduction}%"
fi
