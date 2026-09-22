/**
 * Preview entry for authored indicators. A companion UI publishes an indicator descriptor
 * (`{ geometry, radius, color, label, direction? }`) as a local scene entry; this tool turns the
 * descriptor into `CombatClientFrame` line/ring draws, so every field the payload carries reaches a
 * real consumer instead of being decorative.
 *
 * Accepted `geometry` values and their preview:
 *  - "point":  a small dot at the aim point.
 *  - "circle": a ground ring of `radius`.
 *  - "area":   a ground disc outline (outer `radius` plus an inner guide ring).
 *  - "line":   a segment of `radius` along `direction` (vertical when direction is absent).
 *  - "cone":   two edges at ±`spread`/2 degrees around `direction` plus a closing arc.
 * Unknown geometry falls back to "point"; a missing radius/colour uses the fallback.
 */
namespace IndicatorGeometry {
    export const geometries = ["point", "line", "circle", "area", "cone"];
    export type Renderer = (frame: CombatClientFrame, point: number[], data: any) => void;
    var renderers: { [id: string]: Renderer } = Object.create(null);
    export function register(id: string, render: Renderer): void {
        if (!id || renderers[id]) throw new Error("Duplicate indicator geometry: " + id);
        renderers[id] = render;
    }

    export function accepts(geometry: string): boolean {
        return geometries.indexOf(String(geometry || "")) >= 0 || !!renderers[geometry];
    }

    /** Reads the entry's world position from the scene envelope; returns null when absent. */
    export function position(frame: CombatClientFrame): number[] | null {
        const entry = JSON.parse(frame.data());
        const p = entry && entry.position;
        if (!Array.isArray(p) || p.length !== 3) return null;
        const x = Number(p[0]), y = Number(p[1]), z = Number(p[2]);
        return isFinite(x) && isFinite(y) && isFinite(z) ? [x, y, z] : null;
    }

    export function draw(frame: CombatClientFrame, data: any): void {
        const point = position(frame);
        if (!point) return;
        const geometry = accepts(data && data.geometry) ? String(data.geometry) : "point";
        if (renderers[geometry]) { renderers[geometry](frame, point, data); return; }
        const radius = data && typeof data.radius === "number" && isFinite(data.radius) ? Math.max(0, data.radius) : 0;
        const rawColor = data && typeof data.color === "number" && isFinite(data.color) ? data.color : -1;
        const color = (rawColor >= 0 && rawColor <= 0xFFFFFF ? rawColor | 0xFF000000 : rawColor) | 0;
        const x = point[0], y = point[1], z = point[2];
        const direction = directionOf(data);
        if (geometry === "point") {
            frame.ring(x, y, z, 0.12, color);
            return;
        }
        if (geometry === "circle") {
            frame.ring(x, y, z, radius, color);
            return;
        }
        if (geometry === "area") {
            frame.ring(x, y, z, radius, color);
            return;
        }
        if (geometry === "line") {
            const end = offset(x, y, z, direction || [0, 0, 1], radius);
            frame.line(x, y, z, end[0], end[1], end[2], color);
            return;
        }
        // cone: two edges around the facing direction plus an arc of rays closing the wedge.
        const axis = direction || [0, 0, 1];
        const spread = data && typeof data.spread === "number" && isFinite(data.spread) ? Math.max(0, data.spread) : 60;
        const steps = 8, left = offset(x, y, z, rotateY(axis, -spread / 2), radius), right = offset(x, y, z, rotateY(axis, spread / 2), radius);
        frame.line(x, y, z, left[0], left[1], left[2], color);
        frame.line(x, y, z, right[0], right[1], right[2], color);
        for (let i = 0; i < steps; i++) {
            const a = offset(x, y, z, rotateY(axis, -spread / 2 + spread * (i / steps)), radius);
            const b = offset(x, y, z, rotateY(axis, -spread / 2 + spread * ((i + 1) / steps)), radius);
            frame.line(a[0], a[1], a[2], b[0], b[1], b[2], color);
        }
    }

    function directionOf(data: any): number[] | null {
        const d = data && data.direction;
        if (!Array.isArray(d) || d.length !== 3) return null;
        const x = Number(d[0]), y = Number(d[1]), z = Number(d[2]);
        const length = Math.sqrt(x * x + y * y + z * z);
        return isFinite(length) && length > 1e-6 ? [x / length, y / length, z / length] : null;
    }

    function offset(x: number, y: number, z: number, direction: number[], distance: number): number[] {
        return [x + direction[0] * distance, y + direction[1] * distance, z + direction[2] * distance];
    }

    function rotateY(direction: number[], degrees: number): number[] {
        const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        return [direction[0] * cos + direction[2] * sin, direction[1], -direction[0] * sin + direction[2] * cos];
    }
}
