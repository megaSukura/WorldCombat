/**
 * 浊雾 / smog —— 伙伴 AI 用途。
 *
 * 什么局面下出手：正前方一口雾锥，射程短、伤害低、PP 多、中毒概率最高，挂在共享 attack 位上。
 *   目标可见、敌对、存活、在 `ai.maxChase`（默认 8）以内就考虑；因为雾是锥形，目标身边还挤着别人时
 *   （`ai.cluster`）最值，一口能熏一片。
 * 对谁出手：`ai.seekUnpoisoned`（默认开）时，已经中毒的目标不算候选——重熏只会刷新已有的毒；
 *   关闭则不管是否已毒都照熏。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位送进喷吐距离。
 * 放完之后：被扫到的人很容易带毒，伙伴交回共享顺序；空喷只走冷却。
 * 优先级：成堆 36 ／ 未毒且在射程内 20 ／ 还需先走近 6。
 */
namespace PokemonSkills {
    function smogCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("smog", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "seekUnpoisoned", true) && CompanionBehavior.status(context, target, "poison")) return false;
            return true;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return 0;
            var base = distance <= capability.data.range ? 20 : 6;
            if (!CompanionBehavior.status(context, target, "poison")) base += 6;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && smogCluster(context, target)) return base + 16;
            return base;
        }
    });

    addPreferences("smog", {}, [
        field(pathOf("billow"), "滚涌取向", "boolean", {
            help: "开启：雾锥张角 ×1.2、喷吐距离 ×1.15、中毒概率 ×1.15，但单段威力 ×0.85、滚得更慢，适合一口熏一片。关闭（尖吹）：雾锥更窄更浓、威力 ×1.15、来得更快，适合精准熏单个目标。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "只有在这个距离以内才把对方列为喷吐候选，再由共享接近逻辑把身位送进喷吐距离；调大就是更早开始追。"
        }),
        field(pathOf("ai.seekUnpoisoned"), "只熏未毒目标", "boolean", {
            help: "开启后，已经中毒的目标不算候选——重熏只会刷新已有的毒，不如换个目标；关闭则不管是否已毒都照熏。"
        }),
        field(pathOf("ai.cluster"), "成堆时优先", "boolean", {
            help: "开启后，目标身边 3 格内还挤着别的敌人时优先喷雾，一口熏一片；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为喷到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
