/**
 * 水波刀 / aquacutter 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内；更远交给共享接近逻辑。
 * `ai.cluster`（默认开）实际改变候选排序：开启时，若身前水线方向排着两个以上敌人，把它抬到优先——
 * 一道水线贯穿成排才是它的价值；只有单个目标时按普通远程切斩排序。关闭则不数直线，当单点远程招排。
 * 放完之后：交回共享交战计划；它是点到即穿的直线招，掷完不改变站位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aquacutterId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 25;
            const direction = [target.point[0] - self.point[0], 0, target.point[2] - self.point[2]];
            const length = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]) || 1;
            direction[0] /= length; direction[2] /= length;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let inLine = 0;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.friendly || !(other.health > 0) || other.ref === self.ref) continue;
                const dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
                const along = dx * direction[0] + dz * direction[2];
                if (along < 0 || along > capability.data.range + 2) continue;
                if (Math.abs(dx * direction[2] - dz * direction[0]) <= 1.2) inLine++;
            }
            return inLine >= 2 ? 40 : 25;
        }
    });

    addPreferences(aquacutterId, {}, [
        field(pathOf("lance"), "贯流式", "boolean", {
            help: "开启：威力 ×1.12、贯穿目标多 1、水线收窄 0.05 格，代价是喷射 ×0.88、冷却多 7 刻；关闭：喷射 ×1.12、判定放宽 0.08 格、冷却少 5 刻，代价是威力 ×0.94。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动喷水线，先走近；越大越愿意从远处切出去。"
        }),
        field(pathOf("ai.cluster"), "贯穿一排", "boolean", {
            help: "开启：身前水线方向排着两个以上敌人时优先喷出，一道切穿一排；关闭：不数直线，当普通远程切斩排序。"
        })
    ]);
}
