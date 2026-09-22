/** An independently authored protocol; no move, species or existing purpose owns it. */
namespace CheckObservations {
    export const events: { actor: string; radius: number }[] = [];
    export const modifiers = new WorldContributions.Registry<{ frame: WorldBehavior.Frame; radius: number }>();
    export function observe(frame: WorldBehavior.Frame): void {
        const result = modifiers.apply({ frame, radius: 2 }); events.push({ actor: frame.actor, radius: result.radius });
    }
}
