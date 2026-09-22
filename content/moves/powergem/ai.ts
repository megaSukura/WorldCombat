/**
 * 力量宝石 / powergem 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 16）之内；更远交给共享接近逻辑。
 * 对谁出手：`ai.lineUp`（默认开）打开时，目标身后约 14° 内、射程里还排着别的敌人就抬高优先级——
 *   一道贯穿的光能一次串到几个，那正是它最值的时候；关闭则只按普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进光程之后再射。
 * 放完接什么：交回共享交战计划；它是一次贯穿，不负责收尾。光被方块挡住，所以它会偏好能看到目标的站位。
 */
namespace PokemonSkills {
    /** 从自己经目标往外的同一条线上还有几个敌人（含目标本身），用来判断这一道光能串到几个。 */
    function powergemAligned(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: WorldMethods.Subject): number {
        const self = CompanionBehavior.source(context).point, nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2], length = Math.sqrt(dx * dx + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uz = dz / length, reach = typeof capability.data.range === "number" ? capability.data.range : 12;
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2], distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > reach || distance < 1e-6) continue;
            if ((ox / distance) * ux + (oz / distance) * uz >= 0.97) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(powergemId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 22 : 0;
            if (!CompanionBehavior.ai<boolean>(capability, "lineUp", true)) return base;
            return powergemAligned(context, capability, target) >= 2 ? base + 14 : base;
        }
    });

    addPreferences(powergemId, {}, [
        field(pathOf("focus"), "聚晶", "boolean", {
            help: "开启：光线细到 0.6、射程 +2 格、威力 ×1.15，但起手多 2 刻、冷却多 4 刻，适合单点重击；关闭：光柱更粗，容易串到成排的敌人。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 5, max: 24, step: 1,
            help: "超过这个距离就不主动射，先走近；越大越愿意在更远处开火。"
        }),
        field(pathOf("ai.lineUp"), "瞄准成排", "boolean", {
            help: "开启：目标身后约 14° 内还排着别的敌人时优先开火，一道光能多串一个；关闭则只按普通远程攻击排序。"
        })
    ]);
}
