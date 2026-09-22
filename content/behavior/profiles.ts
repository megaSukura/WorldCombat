/** Open, additive behavior facts. Consumers decide units, defaults and valid ranges. */
namespace BehaviorProfiles {
    export interface Term { source: string; key: string; amount: number; }
    export function add(frame: WorldBehavior.Frame, source: string, values: { [key: string]: number }): void {
        var traits = frame.traits || (frame.traits = {}), terms: Term[] = traits.behavior || (traits.behavior = []);
        Object.keys(values).forEach(function (key) {
            if (!source || !key || !isFinite(values[key])) throw new Error("Invalid behavior contribution");
            terms.push({ source: source, key: key, amount: values[key] });
        });
    }
    export function value(frame: WorldBehavior.Frame, key: string, base: number): number {
        return ((frame.traits && frame.traits.behavior || []) as Term[]).reduce(function (sum, term) {
            return term.key === key ? sum + term.amount : sum;
        }, base);
    }
    export function explain(frame: WorldBehavior.Frame, key: string): Term[] {
        return ((frame.traits && frame.traits.behavior || []) as Term[]).filter(function (term) { return term.key === key; })
            .map(function (term) { return { source: term.source, key: term.key, amount: term.amount }; });
    }
}
