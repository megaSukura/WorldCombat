/**
 * 热沙大地 / scorchingsands 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 13）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.preferClusters`（默认开）打开时优先周围挤着同伴的目标——落点那一把热沙能一次盖住他们；
 *   已经带着共享灼伤身份的目标排后；湿身目标略优先（热沙粘上去更狠）。
 * 够不到怎么办：reach 就是本招射程，不够就靠近；AI 会以目标所在位置为落点。
 * 放完之后：一把带地表的远程压制，交回共享交战计划。
 */
namespace PokemonSkills {
    function scorchingWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    /** 目标脚下是否真的踩在天然沙面：闷烧式只在能烤出连通热区的地方才值得先手。 */
    function scorchingNatural(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), base = CompanionBehavior.point(target.point);
        const x = Math.floor(base.x()), z = Math.floor(base.z()), top = Math.floor(base.y()) + 1;
        for (let dy = 0; dy >= -4; dy--) {
            const block = world.block(WorldCombat.point(x, top + dy, z));
            if (block === null) return false;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return id === "minecraft:sand" || id === "minecraft:red_sand" || block.tagged("c:sand");
        }
        return false;
    }

    function scorchingCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.0) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("scorchingsands", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return scorchingWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !scorchingWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (!CompanionBehavior.status(context, target, "burn")) score += 6;
            if (target.wet) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "preferClusters", true))
                score += Math.min(20, scorchingCluster(context, target) * 10);
            if (capability.data.config && capability.data.config.hearth && scorchingNatural(context, target)) score += 12;
            return score;
        }
    });

    addPreferences("scorchingsands", {}, [
        field(pathOf("hearth"), "闷烧式", "boolean", {
            help: "开启：落点威力 ×0.88，但留下的沙持续闷烧、踏入更易被烫、留存更久，冷却 +8 刻，用来封住一片地。关闭（赤沙式）：落点威力 ×1.08、沙只躺着不再烫人，冷却 −3 刻，用来爆发。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 20, step: 1,
            help: "超过这个距离就不主动扬沙，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.preferClusters"), "优先扎堆目标", "boolean", {
            help: "开启：周围挤着别的敌人的目标排前，落点那一把热沙能一次盖住他们；关闭则只按普通远程攻击排序。"
        })
    ]);
}
