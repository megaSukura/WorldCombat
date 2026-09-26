/**
 * 万有引力 / gravapple 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 9）格内；更远交给共享接近逻辑。
 * 目标头顶要有让苹果落下的真实空间（`freeSpace` 探针），低顶棚里不硬塞一颗穿天花板而过的苹果。
 * `ai.dropFliers` 开启（默认）时按局面排序：**离地的目标最值**（苹果会把它砸回地面、还按原作多打五成），
 * 站定不动（慢速）的目标次之，站在地上还没被压碎防御的再次；已经带着破防身份的目标降到很后。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 *
 * 主伤不看抗击退：`slam` 只是原生受击冲量，抗击退高的 Boss 可能不被压下，但苹果的伤害与破防照常结算。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("gravapple", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            // 目标头顶留得下苹果才落：低顶棚不误判高落程，也不让苹果卡进天花板。
            const world = CompanionBehavior.world(context);
            const top = typeof target.height === "number" && target.height > 0 ? target.height : 1.4;
            const probe = CompanionBehavior.point([target.point[0], target.point[1] + top * 0.5 + 0.5, target.point[2]]);
            return world.freeSpace(probe, 0.7, 0.7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "dropFliers", true)) return 24;
            if (CompanionBehavior.status(context, target, "guardbroken")) return 12;
            if (target.grounded === false) return 42;
            const velocity = target.velocity;
            const speed = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : -1;
            return speed >= 0 && speed < 0.04 ? 30 : 24;
        }
    });

    addPreferences("gravapple", {}, [
        field(pathOf("heavy"), "重坠式", "boolean", {
            help: "开启：苹果拎得更高、落得更沉、砸得更重，但起手与冷却更久、施放距离更短；关闭：出手快、射程长、单发略轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不落苹果，先走近。越大越愿意从远处先手。"
        }),
        field(pathOf("ai.dropFliers"), "专砸离地的", "boolean", {
            help: "开启：优先对离地的目标落苹果（会被砸回地面并受更重的伤害），站定慢速的目标次之，已带破防身份的目标降到最后；关闭：当普通远程攻击排序。"
        })
    ]);
}
