import { describe, it, expect } from "vitest";
import { layoutPieLabels } from "../pieLabelLayout";

const distToSegment = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const cases = {
  // The client dashboard's Fault chart: two big slices and a run of tiny ones.
  fault: [9, 6, 4, 4, 3, 3, 1, 1, 1, 1],
  dominant: [500, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1],
  single: [10],
  even: Array(12).fill(5),
};
const sizes = [[655, 330], [560, 380], [300, 330], [900, 380]];

describe("layoutPieLabels", () => {
  Object.entries(cases).forEach(([name, values]) => {
    sizes.forEach(([width, height]) => {
      it(`${name} at ${width}x${height}: every label inside the box, none overlapping, no leader across the pie`, () => {
        const layout = layoutPieLabels(values, width, height);
        const labels = Object.values(layout.labels);
        expect(labels).toHaveLength(values.length);

        [true, false].forEach((right) => {
          const ys = labels.filter((l) => l.right === right).map((l) => l.y).sort((a, b) => a - b);
          ys.forEach((y, i) => {
            expect(y - layout.lineH / 2).toBeGreaterThanOrEqual(0);
            expect(y + layout.lineH / 2).toBeLessThanOrEqual(height);
            if (i > 0) expect(y - ys[i - 1]).toBeGreaterThanOrEqual(layout.lineH - 1e-6);
          });
        });

        labels.forEach((l) => {
          expect(distToSegment(layout.cx, layout.cy, l.bend, l.lineEnd)).toBeGreaterThanOrEqual(
            layout.radius,
          );
        });
      });
    });
  });

  it("keeps the conventional 12 o'clock start when nothing is crowded", () => {
    expect(layoutPieLabels([10, 10, 10, 10], 600, 380).startAngle).toBe(90);
  });

  it("drops the smallest labels rather than overflowing when one side has too many", () => {
    const values = Array.from({ length: 60 }, (_, i) => 60 - i);
    const layout = layoutPieLabels(values, 600, 300);
    expect(Object.keys(layout.labels).length).toBeLessThan(values.length);
  });
});
