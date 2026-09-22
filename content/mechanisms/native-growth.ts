/** Composable reward plans settle once through the native transaction. */
namespace NativeGrowth {
    export interface Recipient { native: CombatGrowthRecipient; experience: number; ev: { [id: string]: number }; }
    export interface Context { event: CombatGrowthEvent; recipients: Recipient[]; records: { id: "use_move" | "defeat" | "damage_taken" | "recoil" | "critical_hits"; amount: number }[]; data: WorldBehavior.Bag; }
    export const rules = new WorldContributions.Registry<Context>();
    export function handle(event: CombatGrowthEvent): void {
        var context: Context = { event: event, recipients: [], records: [], data: {} };
        for (var i = 0; i < event.recipientCount(); i++) context.recipients.push({ native: event.recipient(i), experience: 0, ev: {} });
        rules.apply(context);
        context.records.forEach(record => event.record(record.id, record.amount));
        context.recipients.forEach(recipient => {
            if (recipient.experience !== 0) recipient.native.experience(recipient.experience);
            Object.keys(recipient.ev).forEach(stat => { if (recipient.ev[stat] !== 0) recipient.native.ev(stat, recipient.ev[stat]); });
        });
    }
}
if (typeof CobblemonCombat !== "undefined") CobblemonCombat.growth(NativeGrowth.handle);
