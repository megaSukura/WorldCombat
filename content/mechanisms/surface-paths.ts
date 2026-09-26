/** Read-only native collider samples for finite ground-following paths. Content supplies travel and sampling budgets. */
namespace SurfacePaths {
    export interface Limits { up: number; down: number; spacing: number; samples: number; }
    export interface Step { point: CombatPoint; path: CombatPoint[]; travelled: number; ended: boolean; }
    /** Native top face at the requested x/z; null includes missing support or unavailable chunks. */
    export function support(world: CombatWorld, point: CombatPoint, up: number, down: number): CombatPoint | null {
        const hit = world.clipBlocks(point.plus(WorldCombat.point(0, up + .025, 0)), point.minus(WorldCombat.point(0, down + .025, 0)));
        if (!hit || !hit.blocked() || hit.blockFace() !== "up") return null;
        const at = hit.position();
        return at.y() <= point.y() + up + .025 && at.y() >= point.y() - down - .025 ? at : null;
    }
    function clear(world: CombatWorld, from: CombatPoint, to: CombatPoint): boolean {
        const clip = world.clipBlocks(from, to); return !!clip && !clip.blocked();
    }
    /** One finite advance. A supported step uses native top heights and a clear lift/cross/drop corridor. */
    export function advance(world: CombatWorld, from: CombatPoint, direction: CombatPoint, distance: number, limits: Limits): Step {
        const heading = WorldGeometry.flatUnit(direction), points = [from];
        let at = from, travelled = 0;
        if (!(distance > 0) || !(limits.spacing > 0) || !(limits.samples > 0)) return { point: at, path: points, travelled, ended: true };
        for (let i = 0; i < Math.floor(limits.samples) && travelled < distance - 1e-6; i++) {
            const step = Math.min(limits.spacing, distance - travelled), wanted = at.plus(heading.scale(step));
            const next = support(world, wanted, limits.up, limits.down);
            if (!next) return { point: at, path: points, travelled, ended: true };
            const y = Math.max(at.y(), next.y()) + .04, top = WorldCombat.point(at.x(), y, at.z()), over = WorldCombat.point(next.x(), y, next.z());
            if (!clear(world, at.plus(WorldCombat.point(0,.04,0)), top) || !clear(world, top, over)
                || !clear(world, over, next.plus(WorldCombat.point(0,.04,0)))) return { point: at, path: points, travelled, ended: true };
            at = next; points.push(at); travelled += step;
        }
        return { point: at, path: points, travelled, ended: travelled < distance - 1e-6 };
    }
}
