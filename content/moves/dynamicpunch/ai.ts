/**
 * 爆裂拳 / dynamicpunch 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一道会被走位躲开的扇面横扫，所以要挑**退无可退的人**：目标背后一米多就是墙或方块时，
 * `ai.punishStuck`（默认开）把 priority 抬高——走不出扇面的目标必吃这一抡，还会被震懵。
 * 目标身边挤着别的敌人时也加分：一道扇面能一起罩住几个。
 * 用完交回共享交战计划；拼命式风险更大，留给想一锤定音的局面。
 */
namespace PokemonSkills {
    /** 目标背后（背离施法者方向）一米多是否有障碍：有的话它走不出这道扇面。 */
    function dynamicpunchStuck(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject): boolean {
        const world = CompanionBehavior.world(context);
        if (!world) return false;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.3) return false;
        const ux = dx / length, uz = dz / length;
        const front = WorldCombat.point(target.point[0], target.point[1] + 0.4, target.point[2]);
        const behind = WorldCombat.point(target.point[0] + ux * 1.5, target.point[1] + 0.4, target.point[2] + uz * 1.5);
        return !world.clear(front, behind);
    }

    CompanionBehavior.registerUse("dynamicpunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "punishStuck", true) && dynamicpunchStuck(context, self, target)) score += 22;
            let crowd = 0;
            const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= capability.data.range) crowd++;
            }
            score += Math.min(18, crowd * 9);
            return score;
        }
    });

    addPreferences("dynamicpunch", {}, [
        field(pathOf("reckless"), "拼命式", "boolean", {
            help: "开启：威力更高、扇面更开、晕得更久，但起手、收招、冷却更长，挥空失衡也更久。关闭：控制更好、循环更短，代价是单下更轻、扇面更窄。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动抡拳，先走近。越大越早贴身出手，也越容易扑空。"
        }),
        field(pathOf("ai.punishStuck"), "优先打被堵住的目标", "boolean", {
            help: "开启：目标背后有墙或障碍、走不出扇面时优先抡它（几乎必吃）；关闭：只按普通近战与人数排序。"
        })
    ]);
}
