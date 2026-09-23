/** Final action cooldowns. Authored durations remain raw; commitment and inspection use the same contributions. */
namespace ActionCooldowns {
    export interface Context {
        world: CombatWorld | null; actor: CombatActor | null; action: string; base: number; ticks: number;
        readAttribute?: (id: string) => CombatAttribute | null;
        contributions: { label: any; value: number; before: number; after: number }[];
    }
    export const rules = new WorldContributions.Registry<Context>();
    export function evaluate(world: CombatWorld | null, actor: CombatActor | null, action: string, ticks: number,
        readAttribute?: (id: string) => CombatAttribute | null): Context {
        const context: Context = { world, actor, action, base: ticks, ticks, readAttribute, contributions: [] };
        rules.apply(context);
        if (!isFinite(context.ticks) || context.ticks < 0) throw new Error("Invalid final cooldown: " + action);
        context.ticks = Math.round(context.ticks);
        return context;
    }
    rules.define({ id: "world_combat:skill_haste", apply: context => {
        const attribute = context.world && context.actor ? context.world.attributeValue(context.actor, "world_combat:skill_haste")
            : context.readAttribute ? context.readAttribute("world_combat:skill_haste") : null;
        if (!attribute) return;
        const haste = attribute.value();
        if (!isFinite(haste) || haste <= -100) throw new Error("Invalid skill haste");
        if (!haste) return;
        const before = context.ticks;
        context.ticks = before * 100 / (100 + haste);
        context.contributions.push({ label: { key: "worldcombat.attributes.skill_haste" }, value: haste, before, after: context.ticks });
    } });
    WorldCombat.on("world_combat:cooldowns/resolve", "world_combat:cooldown", "", event => {
        const data = JSON.parse(event.data());
        data.cooldown = evaluate(event.world(), event.actor(), String(data.action), Number(data.cooldown)).ticks;
        event.data(JSON.stringify(data));
    });
}
