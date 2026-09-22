/**
 * 力量戏法 / powertrick 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内、还没贴身，而且自己现成的攻防差距够大
 *   （max/min ≥ ai.minEdge）。值不值得翻，看当前哪种形态更适合这一场：
 *   守高攻低且自己是物攻手 → 翻过来换攻势；攻高守低且自己偏谨慎或已经受伤 → 翻过去换守势。
 * 什么时候最想出手：满足以上条件时 priority 85，作为开打前的形态准备；已经翻着的个体不重复翻，
 *   只有在血量偏低、当前又翻成了高攻低守时才再演一次翻回来。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：数值已经对调（宝可梦走 NativeModifiers stats 层），窗口内不再重复；窗口走完或再施展一次自动翻回。
 * 配置 long（长戏）改变保持与冷却；ai.minEdge 决定差距多小就不值得翻，ai.minGap 决定贴身时是否放弃，ai.maxChase 决定追击距离。
 */
namespace CompanionBehavior {
    function powertrickValues(access: CombatWorld, actor: CombatActor): { attack: number; defence: number; physical: boolean } {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(access, actor), pokemon = CobblemonCombat.pokemon(actor);
            const attack = NativeEffects.stat(pokemon, state, "atk"), defence = NativeEffects.stat(pokemon, state, "def");
            const special = NativeEffects.stat(pokemon, state, "spa");
            // 物攻倾向用种族值判断，避免个体随机浮动让同一种族偶尔不翻。
            const base = typeof pokemon.baseStat === "function";
            const baseAttack = base ? (pokemon.baseStat("atk") || attack) : attack;
            const baseSpecial = base ? (pokemon.baseStat("spa") || special) : special;
            return { attack: attack, defence: defence, physical: baseAttack >= baseSpecial * 0.8 };
        }
        const attack = access.attributeValue(actor, "minecraft:generic.attack_damage");
        const armour = access.attributeValue(actor, "minecraft:generic.armor");
        return { attack: attack === null ? 0 : attack.value(), defence: armour === null ? 0 : armour.value(), physical: true };
    }
    CompanionBehavior.registerFact("world_combat:powertrick-values", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        const value = powertrickValues(access, actor);
        return JSON.stringify(value);
    });

    function powertrickFoe(context: WorldBehavior.Context, item: WorldBehavior.Capability): CompanionBehavior.Entity | null {
        const self = CompanionBehavior.source(context), nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let best: CompanionBehavior.Entity | null = null, bestDistance = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health <= 0 || other.friendly || !other.visible) continue;
            const gap = CompanionBehavior.distance(self.point, other.point);
            if (gap > CompanionBehavior.ai<number>(item, "maxChase", 14)) continue;
            if (best === null || gap < bestDistance) { best = other; bestDistance = gap; }
        }
        return best;
    }

    function powertrickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, _target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const self = CompanionBehavior.source(context), foe = powertrickFoe(context, item);
        if (!foe) return false;
        if (CompanionBehavior.distance(self.point, foe.point) < CompanionBehavior.ai<number>(item, "minGap", 3)) return false;
        const raw = CompanionBehavior.fact<string>(context, "world_combat:powertrick-values", self);
        if (!raw) return false;
        const value = JSON.parse(raw);
        const low = Math.max(1, Math.min(value.attack, value.defence));
        const edge = Math.max(value.attack, value.defence) / low;
        if (edge < CompanionBehavior.ai<number>(item, "minEdge", 1.15)) return false;
        const flipped = CompanionBehavior.status(context, self, "powertrick");
        const health = CompanionBehavior.ratio(self);
        if (!flipped) {
            if (value.defence > value.attack && value.physical) return true;
            if (value.attack > value.defence && (context.scratch.cautious || health < 0.5)) return true;
            return false;
        }
        return value.attack > value.defence && health < 0.45;
    }

    registerUse("powertrick", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            return powertrickWants(context, item, CompanionBehavior.source(context));
        },
        accepts: function (context, _item, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, item, _target) {
            return powertrickWants(context, item, CompanionBehavior.source(context)) ? 85 : 0;
        }
    });

    const powertrickChase = PokemonSkills.number("ai.maxChase", "戏法距离", 3, 24, 1);
    powertrickChase.help = "威胁进入这个距离内才考虑戏法；越大越早把形态翻好。";
    const powertrickGap = PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1);
    powertrickGap.help = "威胁近于这个距离时不再翻面、直接应对；调大更常在近身时放弃戏法。";
    const powertrickEdge = PokemonSkills.number("ai.minEdge", "最小差距", 1.0, 2.5, 0.05);
    powertrickEdge.help = "攻防差距（大值 / 小值）小于它就不翻；调高只在高攻或高防的极端个体上才演，避免无意义的来回。";

    PokemonSkills.addPreferences("powertrick", { long: true, ai: { maxChase: 14, minGap: 3, minEdge: 1.15 } },
        [powertrickChase, powertrickGap, powertrickEdge]);
}
