/**
 * 精神剑 / psyblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在自己当前刃长之内（未带电时只有短刃距离，要贴身）；更远交给共享接近逻辑。
 * 对谁出手：自己脚下带着电场电荷（共享身份 electricterrain）时，这一刺 ×1.5 且刃线延长，用长长的窄线去数
 *   目标方向上还排着几个非友方——排成一列时最值；离场（没电）时只用短刃，按近刺距离选人、不指望穿排。
 *   `ai.finishLow`（默认开）在对手残血时再抬一档，尝试收掉。够不到就靠近。
 * 放完之后：命中的每个目标各挨一次、被顶开，交回共享顺序决定继续贴身还是走位。
 */
namespace CompanionBehavior {
    function psybladeWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    /** 带电时机体会被自身脚下电荷延长：当前实际刃长 = 短刃 + 延展段。 */
    function psybladeReach(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        const base = typeof capability.data.range === "number" ? capability.data.range : PokemonSkills.p(PokemonSkills.psybladeId, "reach", world);
        if (!CompanionBehavior.status(context, self, "electricterrain")) return base;
        return base + PokemonSkills.p(PokemonSkills.psybladeId, "surge", world);
    }

    /** 以自己→目标这条线为轴，数一数窄线内还排着几个非友方（含目标）；只有带电的长线才值得数。 */
    function psybladeLineCount(context: WorldBehavior.Context, target: CompanionBehavior.Entity, reach: number): number {
        const world = CompanionBehavior.world(context);
        const self = CompanionBehavior.source(context).point;
        const half = Math.max(0.2, PokemonSkills.p(PokemonSkills.psybladeId, "bladeHalf", world));
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2], length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uz = dz / length;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2];
            const along = ox * ux + oz * uz;
            if (along < 0 || along > reach) continue;
            const lateral = Math.abs(ox * uz - oz * ux);
            if (lateral <= half + 0.3) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(PokemonSkills.psybladeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return psybladeReach(context, capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psybladeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psybladeWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const reach = psybladeReach(context, capability);
            if (CompanionBehavior.distance(self.point, target.point) > reach) return 0;
            const charged = CompanionBehavior.status(context, self, "electricterrain");
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "seekTerrain", true) && charged) {
                score += 24;
                // 带电的长线：目标方向上排着别人时，一次能刺穿整排。
                if (psybladeLineCount(context, target, reach) >= 2) score += 10;
            }
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) <= 0.4)
                score += 14;
            return score;
        }
    });

    const psybladeChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 16, 1);
    psybladeChase.help = "超过这个距离就不主动出手，先贴近；精神剑必须贴身，数值比远程招小。";
    const psybladeSeek = PokemonSkills.flag("ai.seekTerrain", "站在电荷上时优先");
    psybladeSeek.help = "开启：自己脚下带着电场电荷时优先刺出这一刀，因为此时威力 ×1.5、刃线延长，还更愿意挑排成一列的敌人穿过去；关闭则不看地形、按普通近身刺排序。";
    const psybladeFinish = PokemonSkills.flag("ai.finishLow", "收残血");
    psybladeFinish.help = "开启：对手血量低于四成时优先刺出这一记重锋，尝试收掉；关闭则不特别看血量。";

    PokemonSkills.addPreferences(PokemonSkills.psybladeId, { ai: { maxChase: 9, seekTerrain: true, finishLow: true } },
        [psybladeChase, psybladeSeek, psybladeFinish]);
}
