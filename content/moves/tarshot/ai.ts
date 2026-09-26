/**
 * 沥青射击 的伙伴 AI 用途：这招自己的一套出手计划——先把目标糊上，再靠火收尾。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase（默认 12）格以内。
 *   己方当前有效技能槽有可用的火属性攻击时更积极（+14），沥青的 ×2 弱点才有兑现方；
 *   目标比术者更快时加分（+18）：泼慢它收益最大。
 *   `ai.coatFirst`（默认开）只对身上还没有沥青的目标出手——沥青的价值在「打开火焰弱点」，
 *   糊过的目标重复泼没有新收益；此时伙伴会把出手让给队里的火招。关掉则照常补泼，续时长。
 * 对谁出手：当前威胁；焦点目标再加一档。
 * 够不到怎么办：reach 就是泼洒距离，超出先走近；沥青团有飞行时间，掩体挡住时交回共享接近逻辑。
 * 放完之后：目标掉速度、身上覆黑膜、脚下多一滩沥青，伙伴交回共享顺序；若队里有火招，接下来那一下会吃到 ×2。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("tarshot", { ai: { maxChase: 12, coatFirst: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.coatFirst", "只泼没糊过的"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    /** Read equipped effective moves, including temporary replacements; unknown native bodies supply no move evidence. */
    function tarshotFireAlly(context: WorldBehavior.Context): boolean {
        const self = source(context), access = world(context), nearby = [self].concat((context.facts.nearby || []) as Entity[]);
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref !== self.ref && (!other.friendly || other.health <= 0)) continue;
            const actor = access.actor(other.ref);
            if (!actor || !access.valid(actor) || String(actor.domain()) !== "cobblemon") continue;
            const pokemon = CobblemonCombat.pokemon(actor);
            for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
                const equipped = pokemon.move(slot);
                if (equipped === null || equipped.pp() <= 0) continue;
                const selected = NativeLoadout.selection(access, slot, equipped, actor);
                const move = CobblemonCombat.moveTemplate(selected.id);
                if (String(move.type()).toLowerCase() === "fire" && String(move.category()).toLowerCase() !== "status") return true;
            }
        }
        return false;
    }

    function tarshotWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (ai<boolean>(item, "coatFirst", true) && status(context, threat, "tarshot")) return false;
        return context.facts.focus === threat.ref || distance(self.point, threat.point) <= ai<number>(item, "maxChase", 12);
    }

    registerUse("tarshot", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || tarshotWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !tarshotWants(context, item, target)) return 0;
            const self = source(context);
            let value = 34;
            if (typeof target.speed === "number" && typeof self.speed === "number" && target.speed > self.speed) value += 18;
            if (tarshotFireAlly(context)) value += 14;
            if (context.facts.focus === target.ref) value += 8;
            return Math.min(88, value);
        }
    });
}
