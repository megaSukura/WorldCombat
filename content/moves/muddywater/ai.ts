/**
 * 浊流 / muddywater 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个朝身前铺开的宽扇形，适合打在**成排**的敌人身上。目标可见、敌对、存活，
 *   且在 `ai.maxChase`（默认 15）格内；更远交给共享接近逻辑。
 * 为什么站远一点更好：射程 8–16 格，泥浪会沿准线越过主目标继续铺，站在射程边缘对着一条线更划算。
 * 对谁出手：当前威胁；`ai.preferCrowd`（默认开）下，目标方向扇面里还挤着别的敌人就抬高 priority——
 *   一次糊一排；主目标已经带着共享身份 aim_impaired 时降一档（重复糊眼价值低，但仍可为身边人服务）。
 * 够不到怎么办：reach 就是本招射程，不够先走近；泥浪会继续向前铺，站得正对更划算。
 * 放完之后：扇形里的敌人命中一起下降、并带着 murky，伙伴交回共享顺序继续交战。
 */
namespace PokemonSkills {
    function muddywaterWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 15)) return false;
        return true;
    }

    /** 以当前威胁方向为准，扇面里看得见的非友方数量；命中判定仍走招式自己的张角与形状。 */
    function muddywaterInCone(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity, angleDegrees: number): number {
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        const hx = dx / length, hz = dz / length, cosHalf = Math.cos(angleDegrees * Math.PI / 360);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const gap = Math.sqrt(ox * ox + oz * oz);
            if (gap > 16) continue;
            if (gap > 0.001 && (ox / gap * hx + oz / gap * hz) < cosHalf) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(muddywaterId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return muddywaterWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !muddywaterWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 17;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true) && muddywaterInCone(context, self, target, 70) >= 2) score += 10;
            if (CompanionBehavior.status(context, target, "aim_impaired")) score -= 7;
            return score;
        }
    });

    addPreferences(muddywaterId, {}, [
        field(pathOf("silted"), "淤积式", "boolean", {
            help: "开启：扇面 ×1.35、糊眼概率 +12%、可掉 2 级命中、糊眼与地面泥淤都更久，适合把一片区域封住；代价是威力 ×0.85、射程 −1.5 格、推进更慢、起手 +3 刻、冷却 +6 刻。关闭（急流）：威力 ×1.12、射程 +1.5 格、推进更快，代价是糊眼概率 −6%、泥淤 ×0.7，打完就走。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动漫泥浪，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.preferCrowd"), "成排时优先", "boolean", {
            help: "开启后，目标方向的扇面里还站着别的敌人时优先漫这一发，一次糊一排；关闭则只按普通攻击排序。"
        })
    ]);
}
