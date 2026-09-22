/** Non-slot actions use the same native action runtime, permissions, cooldowns and owned resources. */
namespace WorldAbilities {
    export interface Grant {
        id: string;
        action: string;
        use: string;
        protocols: string[];
        kind: "enemy" | "friend" | "aim" | "point" | "motion" | "self";
        range: number;
        config?: any;
        arguments?: { [key: string]: string | number | boolean };
        available?: boolean;
    }
    export function grant(frame: WorldBehavior.Frame, definition: Grant): void {
        if (!definition.id || !definition.action || !definition.use || !isFinite(definition.range) || definition.range < 0)
            throw new Error("Invalid world ability grant");
        if (frame.capabilities.some(item => item.id === definition.id)) throw new Error("Duplicate ability grant: " + definition.id);
        const world: CombatWorld = frame.services.world;
        frame.capabilities.push({ id: definition.id, protocols: definition.protocols.slice(), data: {
            action: definition.action, use: definition.use, kind: definition.kind, range: definition.range,
            ready: world.readiness(definition.action) === "",
            available: definition.available !== false, config: definition.config || {}, arguments: definition.arguments || {}
        } });
    }
    /** Reacquire the grant from the current frame; callers never retain a prior tick's authority. */
    export function invoke(frame: WorldBehavior.Frame, id: string, target: WorldMethods.Subject): boolean {
        return submit(frame, id, target) > 0;
    }
    /** Exact accepted action instance, including synchronous completion; zero on preflight refusal. */
    export function submit(frame: WorldBehavior.Frame, id: string, target: WorldMethods.Subject): number {
        const item = frame.capabilities.filter(value => value.id === id)[0];
        if (!item || !item.data.action || item.data.available === false) return 0;
        const world: CombatWorld = frame.services.world, origin = world.observe(world.source());
        if (!origin || world.readiness(item.data.action) !== "") return 0;
        const kind = item.data.kind;
        const actual = kind === "self" ? world.source() : kind === "point" || kind === "motion" ? null : world.actor(target.ref);
        if (kind !== "point" && kind !== "motion" && !actual) return 0;
        const observed = actual ? world.observe(actual) : null;
        if (actual && !observed) return 0;
        if (!Array.isArray(target.point) || target.point.length !== 3 || target.point.some(value => typeof value !== "number" || !isFinite(value))) return 0;
        const point = WorldCombat.point(target.point[0], target.point[1], target.point[2]);
        const delta = point.minus(origin.position());
        const distance = (observed ? observed.position() : point).minus(origin.position()).length();
        if (distance > item.data.range || actual && kind !== "self" && (kind === "friend") !== world.friendly(actual)) return 0;
        const direction = delta.length() < .01 ? WorldCombat.point(0, 0, 1) : delta.unit();
        return Number(world.cast(item.data.action, actual, point, direction, JSON.stringify(item.data.arguments || {})));
    }
}
