/**
 * 雷电拳 / thunderpunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferCrowd`（默认开）打开时，目标身边还挤着别的敌人就优先——电弧能一起点亮；
 *   已经在麻痹的目标排得更后（再电它收益小）。
 * 够不到怎么办：快拳射程短，reach 之内才动手，不够先贴近。
 * 放完之后：把挂上麻痹的目标交回共享交战计划，让队友接手减速窗口。
 */
namespace PokemonSkills {
    function thunderpunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("thunderpunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return thunderpunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !thunderpunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 21;
            let crowd = 0;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) {
                const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                    if (CompanionBehavior.distance(other.point, target.point) <= 3.2) crowd++;
                }
                if (crowd > 0) score += Math.min(18, crowd * 9);
            }
            if (CompanionBehavior.status(context, target, "paralysis")) score -= 8;
            // 站定目标（扎根 / 被束缚）能让放电窗稳满，优先贴近；对一直跑的敌人没有可链邻敌时不为了链电强追。
            if (CompanionBehavior.bound(context, target)) score += 8;
            const motion = CompanionBehavior.velocity(context, target);
            const speed = motion ? Math.sqrt(motion[0] * motion[0] + motion[2] * motion[2]) : 0;
            if (crowd === 0 && speed > 0.15) score -= 6;
            return score;
        }
    });

    addPreferences("thunderpunch", {}, [
        field(pathOf("overcharge"), "超载式", "boolean", {
            help: "开启：电弧跳得更远（射程 ×1.3）、可链到第三个目标、跃电麻痹概率更高，但主拳更轻（威力 ×0.88）、主目标麻痹略降、冷却更久——打群。关闭（点穴式）：主拳更重、麻痹更集中，但链得更近。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。快拳射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferCrowd"), "优先打扎堆", "boolean", {
            help: "开启：目标身边还挤着别的敌人时优先出拳，电弧能一起点亮；关闭则只按普通近战排序。"
        })
    ]);
}
