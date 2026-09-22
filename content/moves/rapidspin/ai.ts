/**
 * 高速旋转 / rapidspin 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记原地旋开的脱身招。缠在身上的 rooted 世界效果或共享身份 partiallytrapped／trapped／
 *   leechseed 还在时，它立刻出手（priority 115，抢在所有行动前）——这招就是用来甩脱的。没有束缚时，威胁
 *   进入 `ai.maxChase`（默认 8）格内也可以旋一记、顺手提速（priority 44）。
 * 对谁出手：自己；没有束缚时把它当成一记近距扫场，由共享任务把目标带进 `radius` 内再原地旋开。
 * `ai.cluster`（默认开）打开时，目标身边 3.5 格内还挤着别的敌人就抬高 priority，一次扫开一圈。
 * 够不到怎么办：交给共享接近逻辑；走不到就先不旋。
 * 放完之后：束缚被甩掉、速度抬起来，交回共享交战计划。
 */
namespace PokemonSkills {
    function rapidspinBound(context: WorldBehavior.Context): boolean {
        return CompanionBehavior.bound(context, CompanionBehavior.source(context));
    }
    function rapidspinCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("rapidspin", {
        protocols: ["world_combat:fortify", "world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (rapidspinBound(context)) return true;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            const self = CompanionBehavior.source(context);
            return target.ref === self.ref || (!target.friendly && target.health > 0 && target.visible);
        },
        approachTarget: function (context, capability, target) { return target || CompanionBehavior.source(context); },
        priority: function (context, capability, target) {
            if (context.facts.mounted) return 0;
            if (rapidspinBound(context)) return 115;
            if (!target) return 0;
            let score = 44;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && !target.friendly && rapidspinCluster(context, target) >= 2) score += 14;
            return score;
        }
    });

    addPreferences("rapidspin", {}, [
        field(pathOf("wide"), "广旋", "boolean", {
            help: "开启：旋风半径 ×1.3、风屑更密、顶开 ×1.15，一次扫开更大一圈；代价是威力 ×0.9、起手 +2 刻、冷却 +8 刻。关闭（紧旋）：威力 ×1.1、出手快、冷却短，但只扫得到贴身的人。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "没有束缚时，威胁进入这个距离内才主动旋一记；越大越早旋开并提速，也越容易空转。"
        }),
        field(pathOf("ai.cluster"), "被围时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先高速旋转，一次扫开一圈；关闭则只按普通自卫节奏出手。"
        })
    ]);
}
