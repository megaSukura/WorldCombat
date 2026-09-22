/**
 * 喷水 / waterspout 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一道以自身为中心、把一圈人推开并浇湿的潮墙。`available` 要求有可见、敌对、存活
 * 且在 `ai.maxChase`（默认 8）格内的目标；`priority` 在自己血量越满、以及（开了 `ai.peel` 时）贴身的
 * 敌人越多时抬高——那正是这一推最值的时候（把人从脸上冲开）。回卷式把推改成拉，适合把人拉进随后的一发。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function waterspoutWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    function waterspoutPress(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= 2.6) count++;
        }
        if (CompanionBehavior.distance(self.point, target.point) <= 2.6 && count === 0) count = 1;
        return count;
    }

    CompanionBehavior.registerUse("waterspout", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return waterspoutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !waterspoutWants(context, capability, target)) return 0;
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            let score = 18 + Math.round(ratio * 14);
            if (CompanionBehavior.ai<boolean>(capability, "peel", true)) {
                const pressed = waterspoutPress(context, target);
                if (pressed >= 2) score += 18; else if (pressed === 1) score += 6;
            }
            return score;
        }
    });

    addPreferences("waterspout", {}, [
        field(pathOf("undertow"), "回卷式", "boolean", {
            help: "开启：潮水反过来把人拉向自己、湿身更久，但浪头 ×0.82、推得更近、起手与冷却更长；关闭（推涌式）＝把人推开、威力更足，用来把人从脸上冲走。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在潮头外待命。越大越愿意先朝目标接近再掀潮。"
        }),
        field(pathOf("ai.peel"), "贴身时优先", "boolean", {
            help: "开启后，自己身边 2.6 格内挤着敌人时优先喷水，用潮墙把人冲开；关闭则只按普通攻击排序、不特别逃离贴身。"
        })
    ]);
}
