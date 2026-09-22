/**
 * 十字毒刃 / crosspoison 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）之内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferUnpoisoned`（默认开）打开时，还没中毒的目标排得更前——初毒 + 渗毒是这一招的价值；
 *   `ai.preferPair`（默认开）打开时，目标两侧那条剪线上还站着另一个敌人就再抬一档，一剪划到两个。
 * 够不到怎么办：出手距离交给 `reach`，共享任务先把身位收进两刃范围再剪。
 * 放完之后：被剪到的人先按初毒概率、短暂延迟后再按更高的渗毒概率中毒，交回共享交战计划。
 */
namespace PokemonSkills {
    function crosspoisonClose(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    /** 目标两侧那条剪线上还站着几个别的敌人。 */
    function crosspoisonPair(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return 0;
        const ux = dx / length, uz = dz / length;
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref || other.ref === self.ref) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along <= 0.3) continue;
            if (Math.abs(ox * uz - oz * ux) <= 1.1) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("crosspoison", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return crosspoisonClose(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !crosspoisonClose(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 21;
            if (CompanionBehavior.ai<boolean>(capability, "preferUnpoisoned", true) && !CompanionBehavior.status(context, target, "poison")) score += 9;
            if (CompanionBehavior.ai<boolean>(capability, "preferPair", true) && crosspoisonPair(context, target) >= 1) score += 10;
            return score;
        }
    });

    addPreferences("crosspoison", {}, [
        field(pathOf("corrode"), "腐蚀式", "boolean", {
            help: "开启：初毒概率 ×1.2、渗毒概率 ×1.3、中毒 ×1.15，但剪击威力 ×0.9、起手与冷却更久——以毒取胜。关闭（快刃式）：剪得更重更快，但毒更难按进伤口。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动合拢两刃，先走近；出手距离很短，设大也常常够不到。"
        }),
        field(pathOf("ai.preferUnpoisoned"), "优先剪没中毒的", "boolean", {
            help: "开启：还没中毒的目标排得更前，避免把初毒与渗毒浪费在已经中毒的人身上；关闭则所有目标同价。"
        }),
        field(pathOf("ai.preferPair"), "优先能划到两个的", "boolean", {
            help: "开启：目标两侧那条剪线上还站着别的敌人时再抬一档，一剪划到两个；关闭则只看目标本身。"
        })
    ]);
}
