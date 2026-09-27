/** Prearms an independent body, pays native health, and activates only on the matching confirmed death.
 * The payload owns geometry/recipients and must call waiting from its timer, confirm from observedDeath,
 * and forget from end. State fields active/payment/deathId are reserved by this mechanism. */
namespace DeferredSacrifice {
    const payments: { [brain: string]: { required: number; paid: number } } = Object.create(null);
    const settled: { [token: string]: number } = Object.create(null);
    let sequence = 0;
    WorldCombat.on("world_combat:deferred_sacrifice/settlement", "world_combat:damage_settled", "", event => {
        const data = JSON.parse(String(event.data())), token = String(data.departureToken || "");
        if (Object.prototype.hasOwnProperty.call(settled, token))
            settled[token] = data.settled === true && data.actual > 0 ? data.actual : 0;
    });
    export function arm(action: CombatAction, at: CombatPoint, definition: string, state: any, ticks: number,
                        done: (current: CombatAction) => void, cause: string): boolean {
        const world = action.world(), payer = action.actor(), facts = world.observe(payer);
        if (!facts || !(facts.health() > 0)) return false;
        state.active = false;
        state.payment = { ref: String(payer.ref()), entity: String(payer.ref()).split("/")[0], tick: world.tick(),
            cause: cause, deadline: world.tick() + 6 };
        let body: CombatActor;
        try {
            body = WorldBodies.spawn(world, at, { size: [.1, .1], health: 1, gravity: false, pushable: false,
                targetable: false, noPhysics: true, invulnerable: true, silent: true, fireImmune: true },
                definition, state, Math.max(8, ticks + 8));
        } catch (failure) { return false; }
        const info = WorldBodies.info(world, body);
        if (!info) return false;
        const receipt = { required: facts.health(), paid: 0 };
        payments[String(info.brain)] = receipt;
        // Refusal/rescue leaves a living action; fatal payment cancels this callback with the action.
        action.after(1, current => { done(current); });
        receipt.paid = world.payHealth(receipt.required, state.payment.cause, 0);
        // Only a detached numeric receipt is touched after payment. The action may already be invalid.
        return true;
    }
    export function confirm(brain: CombatEffect, death: CombatNativeDeathFacts): any | null {
        const state = JSON.parse(brain.state()), payment = state.payment, receipt = payments[String(brain.id())];
        if (state.active || !payment || !receipt || receipt.paid + .0001 < receipt.required
            || death.victim !== payment.ref || death.entity !== payment.entity || death.sourceEntity !== payment.entity
            || death.tick !== payment.tick || death.damageType !== "world_combat_core:health_cost"
            || death.cause !== payment.cause || brain.world().tick() > payment.deadline) return null;
        delete payments[String(brain.id())];
        state.active = true;
        state.deathId = death.deathId;
        brain.state(JSON.stringify(state));
        return state;
    }
    /** True while waiting or after safely closing an unconfirmed/reloaded request. */
    export function waiting(brain: CombatEffect): boolean {
        const state = JSON.parse(brain.state());
        if (state.active) return false;
        const payment = state.payment, receipt = payments[String(brain.id())];
        if (!payment || !receipt || brain.world().tick() > payment.deadline
            || brain.world().tick() > payment.tick && receipt.paid + .0001 < receipt.required) {
            brain.end(); return true;
        }
        brain.schedule("watch", "watch", 1, "{}");
        return true;
    }
    export function forget(brain: CombatEffect): void { delete payments[String(brain.id())]; }
    export function hurt(brain: CombatEffect, target: CombatActor, amount: number, metadata: string): boolean {
        const data = JSON.parse(metadata), token = "deferred:" + brain.id() + ":" + (++sequence);
        data.departureToken = token; settled[token] = 0;
        try {
            brain.world().hurt(target, amount, JSON.stringify(data));
            return settled[token] > 0;
        } finally { delete settled[token]; }
    }
}
