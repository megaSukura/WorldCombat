/**
 * 力量戏法 / powertrick 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：附近有可见威胁、它在 ai.maxChase 以内。先读当前姿态与此刻有效的攻防——
 *   力量戏法是一段会被 AI 主动翻回的长姿态，所以决策分两路：
 *   · 还没翻：攻防差距够大（max/min ≥ ai.minEdge）、且这次换过去真的落到需要的形态——防高攻低的物攻手
 *     换成攻势；攻高防低又谨慎或受伤时换成守势。若已贴身（低于 ai.minGap）先不摆姿态。
 *   · 已经翻着：以「当前形态 + 血量」做双向选择。翻成攻势形又低血（< ai.low）就主动翻回守势保命；
 *     翻成守势形、血量已回升且自己是物攻手时，翻回攻势继续打。翻回不受 ai.minEdge／ai.minGap 门槛限制，
 *     免得只会一次开关。危急翻回的优先级高于开打前的形态准备。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：数值已经对调（宝可梦走 NativeModifiers stats 层），窗口内不再重复翻，窗口走完或再施展一次自动翻回。
 * 配置 long（长戏）改变保持与冷却；ai.low 决定多低算「低血」，ai.minEdge 决定差距多小就不值得翻，
 *   ai.minGap 决定贴身时是否放弃，ai.maxChase 决定追击距离。
 */
namespace CompanionBehavior {
    /** 只读：此刻有效攻防与物攻倾向；普通实体缺攻击/护甲任一项时 valid=false。 */
    function powertrickStance(access: CombatWorld, actor: CombatActor): { attack: number; defence: number; physical: boolean; valid: boolean } {
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(access, actor), pokemon = CobblemonCombat.pokemon(actor);
            const attack = NativeEffects.stat(pokemon, state, "atk"), defence = NativeEffects.stat(pokemon, state, "def");
            const special = NativeEffects.stat(pokemon, state, "spa");
            // 物攻倾向用种族值判断，避免个体随机浮动让同一种族偶尔不翻。
            const base = typeof pokemon.baseStat === "function";
            const baseAttack = base ? (pokemon.baseStat("atk") || attack) : attack;
            const baseSpecial = base ? (pokemon.baseStat("spa") || special) : special;
            return { attack: attack, defence: defence, physical: baseAttack >= baseSpecial * 0.8, valid: true };
        }
        const attack = access.attributeValue(actor, "minecraft:generic.attack_damage", true);
        const armour = access.attributeValue(actor, "minecraft:generic.armor", true);
        if (attack === null || armour === null) return { attack: 0, defence: 0, physical: true, valid: false };
        return { attack: attack.value(), defence: armour.value(), physical: true, valid: true };
    }

    /** 当前姿态：有效面向哪边（有效攻>防=进攻形／防>攻=守势形）、是否已翻着、物攻倾向与两数。 */
    CompanionBehavior.registerFact("world_combat:powertrick-stance", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        const value = powertrickStance(access, actor);
        const flipped = MobEffects.hasTag(access, actor, "world_combat:status/powertrick");
        const form = value.attack > value.defence ? "offence" : value.defence > value.attack ? "defence" : "even";
        return JSON.stringify({ valid: value.valid, flipped: flipped, attack: value.attack, defence: value.defence, physical: value.physical, form: form });
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
        const raw = CompanionBehavior.fact<string>(context, "world_combat:powertrick-stance", self);
        if (!raw) return false;
        const stance = JSON.parse(raw);
        if (!stance.valid) return false;
        const low = CompanionBehavior.ai<number>(item, "low", 0.5);
        const health = CompanionBehavior.ratio(self);
        if (stance.flipped) {
            // 翻回不受初次门槛限制：当前形态已经不合适的，任何时候都该翻回来。
            if (stance.form === "offence" && health < low) return true;
            if (stance.form === "defence" && stance.physical && health >= Math.min(0.95, low + 0.2)) return true;
            return false;
        }
        if (CompanionBehavior.distance(self.point, foe.point) < CompanionBehavior.ai<number>(item, "minGap", 3)) return false;
        const lowStat = Math.max(1, Math.min(stance.attack, stance.defence));
        const edge = Math.max(stance.attack, stance.defence) / lowStat;
        if (edge < CompanionBehavior.ai<number>(item, "minEdge", 1.15)) return false;
        if (stance.form === "defence" && stance.physical) return true;
        if (stance.form === "offence" && (context.scratch.cautious || health < low)) return true;
        return false;
    }

    function powertrickFlipped(context: WorldBehavior.Context, self: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.status(context, self, "powertrick");
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
            if (!powertrickWants(context, item, CompanionBehavior.source(context))) return 0;
            return powertrickFlipped(context, CompanionBehavior.source(context)) ? 104 : 85;
        }
    });

    const powertrickChase = PokemonSkills.number("ai.maxChase", "戏法距离", 3, 24, 1);
    powertrickChase.help = "威胁进入这个距离内才考虑戏法；越大越早把形态翻好。";
    const powertrickGap = PokemonSkills.number("ai.minGap", "贴身下限", 0, 8, 1);
    powertrickGap.help = "还没翻面时，威胁近于这个距离就先不摆姿态；调大更常在近身时放弃初次翻面（翻回不受它限制）。";
    const powertrickEdge = PokemonSkills.number("ai.minEdge", "最小差距", 1.0, 2.5, 0.05);
    powertrickEdge.help = "还没翻面时，攻防差距（大值 / 小值）小于它就不翻；翻回不受它限制。调高只在高攻或高防的极端个体上才演，避免无意义的来回。";
    const powertrickLow = PokemonSkills.number("ai.low", "低血阈值", 0.2, 0.9, 0.05);
    powertrickLow.help = "血量比例低于它就算「低血」：翻成攻势形时会主动翻回守势保命，调高更早翻回、调低更晚。";

    PokemonSkills.addPreferences("powertrick", { long: true, ai: { maxChase: 14, minGap: 3, minEdge: 1.15, low: 0.5 } },
        [powertrickChase, powertrickGap, powertrickEdge, powertrickLow]);
}
