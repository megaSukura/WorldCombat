/**
 * 聚光灯 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义（敌方，默认）：场上有看得见的威胁、距离在 ai.maxChase 以内、目标身上还没有同一束光，
 *   并且身边至少有 ai.focus 个友方（含自己）凑在目标附近——聚光是为了让一片人一起打它。
 * 对谁出手（敌方）：当前威胁；够不到先交给共享接近逻辑。
 * 候选之间怎么排（敌方）：身边友方越多、目标生命越高，越值得先照；否则只当普通控制用。
 * 照应友军（ai.assist，默认关闭）：开启后，当 ai.maxChase 内有友军生命低于 ai.allyBelow、旁边又有一名
 *   生命不低于 ai.coverFloor 的耐打友军时，AI 会向这名耐打友军聚光，把周围敌人的火力引过去；它因此挨打是
 *   明确的代价，所以只在真有脆弱友军需要被护、且引火者承伤合理时才建议。关闭时只标敌方集火目标。
 * 放完之后：目标继续被照亮并承受更重的伤害，施法者交回共享顺序继续战斗；照明还在时不重复照。
 * 配置：mode 切换穿刺／钉住；ai.maxChase、ai.focus、ai.leaveStation 决定射程、要不要凑够同伴、驻守时是否离位；
 *   ai.assist、ai.allyBelow、ai.coverFloor 决定照应友军的开关与门槛。
 */
namespace CompanionBehavior {
    const spotlightChase = PokemonSkills.number("ai.maxChase", "照射距离", 4, 24, 1);
    spotlightChase.help = "威胁进入这个距离内才考虑照射；调小只在近处打光，调大愿意从更远处先标出目标。";
    const spotlightFocus = PokemonSkills.number("ai.focus", "集火人数", 1, 4, 1);
    spotlightFocus.help = "目标附近至少凑齐这么多友方（含自己）才优先聚光；调 1 表示看得见就照，调大只在真能集火时才用。";
    const spotlightLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    spotlightLeave.help = "开启后，收到驻守命令时也会为聚光离开原位。";
    const spotlightAssist = PokemonSkills.flag("ai.assist", "照应友军");
    spotlightAssist.help = "开启后，附近有脆弱友军被威胁时，会向一名较耐打的友军聚光把火力引过去；关闭则只把敌方标成集火目标。";
    const spotlightAllyBelow = PokemonSkills.number("ai.allyBelow", "友军告急血量", 0.1, 0.9, 0.05);
    spotlightAllyBelow.help = "友军生命低于这个比例才算需要被保护；调高更愿意替人引火，调低只在友军快倒下时才照。";
    const spotlightCoverFloor = PokemonSkills.number("ai.coverFloor", "引火者承伤下限", 0.2, 0.9, 0.05);
    spotlightCoverFloor.help = "只有生命比例不低于这个值的友军才会被选中引火；调高只让更健康的友军承担额外伤害，调低更愿意让伤者也来引火。";

    function spotlightAllies(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && CompanionBehavior.distance(other.point, target.point) <= 8) count++;
        }
        return count;
    }

    /** 需要在 ai.maxChase 内被保护的最脆弱友军；没有则不影响 AI。 */
    function spotlightFragile(context: WorldBehavior.Context, item: WorldBehavior.Capability): CompanionBehavior.Entity | null {
        const self = source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const watch = ai<number>(item, "maxChase", 14), below = ai<number>(item, "allyBelow", 0.5);
        let best: CompanionBehavior.Entity | null = null, bestRatio = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || !other.visible || other.ref === self.ref) continue;
            if (CompanionBehavior.distance(self.point, other.point) > watch) continue;
            const value = CompanionBehavior.ratio(other);
            if (value >= below || value >= bestRatio) continue;
            best = other; bestRatio = value;
        }
        return best;
    }

    /** 引火者：离最脆弱友军最近、且承伤合理（生命不低于 ai.coverFloor）的另一名友军。 */
    function spotlightCoverAlly(context: WorldBehavior.Context, item: WorldBehavior.Capability): CompanionBehavior.Entity | null {
        const fragile = spotlightFragile(context, item);
        if (!fragile) return null;
        const self = source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const reach = ai<number>(item, "maxChase", 14), floor = ai<number>(item, "coverFloor", 0.55);
        let best: CompanionBehavior.Entity | null = null, bestDistance = Infinity;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0 || !other.visible || other.ref === self.ref) continue;
            if (CompanionBehavior.status(context, other, "spotlight")) continue;
            if (CompanionBehavior.ratio(other) < floor) continue;
            if (CompanionBehavior.distance(self.point, other.point) > reach) continue;
            const d = CompanionBehavior.distance(other.point, fragile.point);
            if (d >= bestDistance) continue;
            best = other; bestDistance = d;
        }
        return best;
    }

    PokemonSkills.addPreferences("spotlight", { mode: 0, ai: { maxChase: 14, focus: 1, leaveStation: false, assist: false, allyBelow: 0.5, coverFloor: 0.55 } },
        [spotlightChase, spotlightFocus, spotlightLeave, spotlightAssist, spotlightAllyBelow, spotlightCoverFloor]);

    registerUse("spotlight", {
        protocols: ["world_combat:control", "world_combat:cover"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = source(context);
            if (target.friendly) {
                // 照应友军只在掩护用途、开启 ai.assist 且确有脆弱友军时成立。
                if (purpose !== "world_combat:cover" || !ai<boolean>(capability, "assist", false)) return false;
                if (target.ref === self.ref || target.health <= 0 || !target.visible) return false;
                if (status(context, target, "spotlight")) return false;
                if (ratio(target) < ai<number>(capability, "coverFloor", 0.55)) return false;
                if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 14)) return false;
                return spotlightFragile(context, capability) !== null;
            }
            if (!context.senses["world_combat:threat"]) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(capability, "leaveStation", false)) return false;
            if (target.health <= 0 || !target.visible) return false;
            if (status(context, target, "spotlight")) return false;
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 14)) return false;
            return spotlightAllies(context, target) >= ai<number>(capability, "focus", 1);
        },
        selectTarget: function (context, capability, proposed) {
            const self = source(context);
            if (!proposed) return null;
            if (proposed.ref !== self.ref) return proposed;
            // 掩护用途以自身为提议目标：改朝一名引火友军；未开启照应则放弃这条用途。
            return ai<boolean>(capability, "assist", false) ? spotlightCoverAlly(context, capability) : null;
        },
        accepts: function (context, capability, target) {
            const self = source(context);
            if (target.friendly) {
                return ai<boolean>(capability, "assist", false) && target.ref !== self.ref
                    && target.health > 0 && target.visible && !status(context, target, "spotlight");
            }
            return target.ref !== self.ref && target.health > 0 && target.visible && !status(context, target, "spotlight");
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly) return 30;
            const crowd = spotlightAllies(context, target);
            if (crowd >= ai<number>(capability, "focus", 1) + 1) return 45;
            return target.maximum > 0 && target.health / target.maximum > 0.6 ? 35 : 25;
        }
    });

    /** 被照亮的目标进入共享威胁排序，脚本化伙伴/野生 AI 也会优先扑向这束光。 */
    targetPriority("spotlight-draw", function (candidate) {
        if (status(candidate.context, candidate.subject, "spotlight")) { candidate.qualifies = true; candidate.score -= 55; }
    });
}
