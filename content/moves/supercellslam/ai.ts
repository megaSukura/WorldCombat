/**
 * 闪电强袭 / supercellslam 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着、在 `ai.maxChase`（默认 10，比其它跳击更远）之内，
 * 且**自身生命比例不低于 `ai.minSelf`**——蓄电落空要按最大生命自伤，血太少时它会主动放弃。
 * 对谁出手：满血或高生命的对手更值这一记带电强袭。
 * 放完之后：交给共享顺序继续——命中放电后收招利落，不需要特意后撤。
 * 蓄电等级由玩家配置承担，不由 AI 重复。
 */
namespace PokemonSkills {
    function supercellslamWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(item, "minSelf", 0.3)) return false;
        if (CompanionBehavior.distance(self.point, target.point)
            > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
        const world = CompanionBehavior.world(context);
        const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
        // 净空：头顶要放得下这一次拔起。
        const head = from.plus(WorldCombat.point(0, (self.height || 1.4) * 0.6, 0));
        const ceiling = world.clipBlocks(head, head.plus(WorldCombat.point(0, 1.6, 0)));
        if (ceiling !== null && ceiling.blocked()) return false;
        // 斜扑通路：到目标要有直视线，墙后不补目标。
        if (!world.clear(from, to)) return false;
        // 敌快离点：目标正沿远离方向快速移动时，锁死的落点线会扑空，避用。
        const velocity = target.velocity;
        if (velocity) {
            const awayX = target.point[0] - self.point[0], awayZ = target.point[2] - self.point[2];
            const away = Math.sqrt(awayX * awayX + awayZ * awayZ);
            if (away > 0.5 && (velocity[0] * awayX + velocity[2] * awayZ) / away > 0.18) return false;
        }
        return true;
    }

    CompanionBehavior.registerUse("supercellslam", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return supercellslamWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !supercellslamWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ratio(target) >= 0.7) score += 12;
            if (context.facts.focus === target.ref) score += 6;
            return score;
        }
    });

    addPreferences("supercellslam", {}, [
        field(pathOf("charge"), "蓄电等级", "number", {
            min: 0, max: 3, step: 1,
            help: "腾空前蓄几级电：每级强袭威力 ×1.07、电花 +8、下坠更快、落空自伤 +0.01，但起手 +2 刻、冷却 +3 刻、射程 -0.2 格。0 级是快速轻坠。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 16, step: 1,
            help: "目标在这个距离以内才主动带电下压，否则先走近。比其它跳击更远，适合先手消耗。"
        }),
        field(pathOf("ai.minSelf"), "最低自身血量", "number", {
            min: 0, max: 1, step: 0.05,
            help: "自身生命比例低于这个值时不再用闪电强袭（落空自伤可能致命）。调高更保守，调低更愿意冒险。"
        })
    ]);
}
