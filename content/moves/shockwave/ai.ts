/**
 * 电击波 / shockwave 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.preferWet`（默认开）：目标湿身或在雨里时抬高 priority，因为电沿水传导更狠。
 * 地导形态不是连锁电：它只沿目标那条线扫，所以同一条线上还站着别的敌人时更值得开。
 * 便宜、快、射程中等，所以它不是最后的近身选择，而是先手消耗与收尾手段。
 */
namespace PokemonSkills {
    /** 目标身后大致同线的敌人数量（地导走廊真正能扫到的那些）。 */
    function shockwaveLined(context: WorldBehavior.Context, target: WorldMethods.Subject, reach: number): number {
        const self = CompanionBehavior.source(context).point;
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2];
        const span = Math.sqrt(dx * dx + dz * dz) || 1;
        const ux = dx / span, uz = dz / span;
        let count = 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === target.ref) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2];
            const along = ox * ux + oz * uz;
            if (along < 0 || along > reach) continue;
            const across = Math.abs(ox * uz - oz * ux);
            if (across <= 1.8) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("shockwave", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 18 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "preferWet", true) && target.wet) base += 16;
            var ground = !!(capability.data.config && capability.data.config.ground);
            if (ground && base > 0 && shockwaveLined(context, target, capability.data.range) >= 1) base += 10;
            return base;
        }
    });

    addPreferences("shockwave", {}, [
        field(pathOf("ground"), "地导形态", "boolean", {
            help: "开启：电流沿瞄准方向扫过身前贴地的走廊，命中沿途所有敌人、射程更远，但每个目标承受地导威力、起手多 2 刻、冷却多 5 刻。关闭：直击单体，沿直线闪到目标身上、威力更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动放电，先走近。越大越会在更远处先手点电。"
        }),
        field(pathOf("ai.preferWet"), "优先湿处", "boolean", {
            help: "开启后，湿身或在雨中的目标会被优先放电，因为电沿水传导更狠；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时放电。"
        })
    ]);
}
