/** Capture contributions share one calculation and the original native capture transaction. */
namespace NativeCapture {
    export interface Context { event: CombatCaptureEvent; multiplier: number | null; data: WorldBehavior.Bag; }
    export const rules = new WorldContributions.Registry<Context>();
    export function handle(event: CombatCaptureEvent): void {
        var context = rules.apply({ event: event, multiplier: null, data: {} });
        if (context.multiplier !== null) event.multiplier(context.multiplier);
    }
}
if (typeof CobblemonCombat !== "undefined") CobblemonCombat.capture(NativeCapture.handle);
