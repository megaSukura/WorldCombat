/** Finite horizontal boundaries. Content owns membership, radius, lifetime and voluntary/forced movement policy. */
namespace WorldBoundaries {
    export type Result = "inside" | "held" | "escaped" | "refused";
    export interface Circle { centre: CombatPoint; radius: number; margin: number; height: number; step: number; }
    /** Inspect current native body facts; never restore an old coordinate after an external departure. */
    export function contain(world: CombatWorld, actor: CombatActor, circle: Circle,
        move: (actor: CombatActor, delta: CombatPoint) => number): Result {
        const body = world.observe(actor); if (!body) return "escaped";
        const delta = body.position().minus(circle.centre), flat = WorldCombat.point(delta.x(), 0, delta.z()), distance = flat.length();
        if (distance > circle.radius + circle.margin || Math.abs(delta.y()) > circle.height) return "escaped";
        if (distance < .001) return "inside";
        const out = flat.unit(), velocity = body.velocity(), outward = velocity.x() * out.x() + velocity.z() * out.z();
        const inner = Math.max(.1, circle.radius - circle.margin);
        if (distance < inner || outward < -.01) return "inside";
        const requested = Math.min(circle.step, Math.max(.02, distance - inner + Math.max(0, outward)));
        return move(actor, out.scale(-requested)) > .001 ? "held" : "refused";
    }
}
