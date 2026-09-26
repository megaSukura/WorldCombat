/**
 * 直冲钻 / drillrun 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 7）格内；更远交给共享接近逻辑。
 * `ai.line`（默认开）实际改变候选排序：开启时，若身前冲刺走廊上排着两个以上敌人，把它抬到优先——
 * 一钻贯穿一串才是它的价值；只有单个目标时按普通中近程接触招排序。关闭则不数直线，当单点钻击排。
 * 放完之后：交回共享交战计划；它与目标拉开一点身位（钻穿后停在目标另一侧），由共享顺序决定接着打还是走位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(drillrunId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "line", true)) return 24;
            // 用本个体实际的冲程与钻头判定数一数这条冲刺线上排了几个敌人：两个以上才值得一钻贯穿。
            const world = CompanionBehavior.world(context);
            const charge = p(drillrunId, "charge", world);
            const radius = p(drillrunId, "drill", world);
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
                if (along < 0 || along > charge) continue;
                const lateral = Math.abs(dx * direction[2] - dz * direction[0]);
                const half = radius + (typeof other.width === "number" ? other.width / 2 : 0.45);
                if (lateral <= half) inLine++;
            }
            return inLine >= 2 ? 40 : 24;
        }
    });

    addPreferences(drillrunId, {}, [
        field(pathOf("carve"), "重钻式", "boolean", {
            help: "开启：威力 ×1.10、犁沟长 1.2 格、沟寿命久 40 刻、钻穿时把目标顶得更开，代价是冲速 ×0.85、冲程 ×0.9、冷却多 8 刻；关闭：冲得更快更远、冷却更短，威力 ×0.94、犁沟短 0.5 格。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动起钻，先走近；越大追得越执着。"
        }),
        field(pathOf("ai.line"), "一线贯穿", "boolean", {
            help: "开启：身前冲刺走廊上排着两个以上敌人时优先起钻，一次贯穿一串；关闭：不数直线，当普通中近程钻击排序。"
        })
    ]);
}
