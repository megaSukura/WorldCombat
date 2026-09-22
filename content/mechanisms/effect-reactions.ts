/** Synchronous reactions run in an existing effect's own source/controller scope. Receipts carry plain facts only. */
namespace EffectReactions {
    interface Receipt { effect: number; operation: string; caller: string; payload: string; }
    const pending: { [id: number]: Receipt } = Object.create(null);
    let sequence = 0;
    export function register(definition: string, operation: string, react: (effect: CombatEffect, facts: any) => void): void {
        WorldCombat.effectHandler(definition, "operation:" + operation, function (effect) {
            const id = Number(JSON.parse(effect.input()).receipt), receipt = pending[id];
            if (!receipt || receipt.effect !== effect.id() || receipt.operation !== operation
                || receipt.caller !== String(effect.caller().key())) { effect.reject("reaction-not-issued"); return; }
            delete pending[id];
            react(effect, JSON.parse(receipt.payload));
        });
    }
    /** The receipt exists only during this call; a direct or replayed operation cannot invoke a reaction. */
    export function invoke(world: CombatWorld, effect: number, operation: string, facts: any): boolean {
        const id = ++sequence;
        pending[id] = { effect: effect, operation: operation, caller: String(world.source().key()), payload: JSON.stringify(facts) };
        try { return world.operation(effect, operation, JSON.stringify({ receipt: id })); }
        finally { delete pending[id]; }
    }
}
