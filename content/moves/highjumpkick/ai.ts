/**
 * 飞膝踢 / highjumpkick 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着、在 `ai.maxChase` 之内，且**自己生命比例不低于 `ai.minSelf`**——
 * 砸偏要按最大生命自伤，血太少时这一记可能把自己送走，所以低血时它会主动放弃、改用别的办法。
 * 对谁出手：偏硬的目标更值这一记（满血或高生命的对手优先），正在被自己盯住的目标也略高。
 * 放完之后：落地即后退一小步，不和刚从高空摔下来、可能正在挨打的自己重叠。
 */
namespace PokemonSkills {
    function highjumpkickWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(item, "minSelf", 0.35)) return false;
        if (CompanionBehavior.distance(self.point, target.point)
            > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        // 低顶不选：头顶放不下这次拔起就换别的招，避免假升空。
        const world = CompanionBehavior.world(context);
        const from = CompanionBehavior.point(self.point);
        const head = from.plus(WorldCombat.point(0, (self.height || 1.4) * 0.6, 0));
        const ceiling = world.clipBlocks(head, head.plus(WorldCombat.point(0, 2.4, 0)));
        return ceiling === null || !ceiling.blocked();
    }

    CompanionBehavior.registerUse("highjumpkick", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return highjumpkickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !highjumpkickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ratio(target) >= 0.7) score += 14;
            if (context.facts.focus === target.ref) score += 8;
            // 停顿或正在攻击的对手更值这一记重膝；高速横移的目标容易在滞空窗口里让开。
            if (target.attacking) score += 6;
            const velocity = target.velocity;
            const moving = velocity ? Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]) : 0;
            if (moving > 0.2 && !target.attacking) score -= 8;
            return score;
        },
        after: function (context, capability, target, progress) {
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > 4) return;
            if (!progress.backUntil) progress.backUntil = context.tick + 10;
            if (context.tick > progress.backUntil) return;
            const away = [self.point[0] * 2 - target.point[0], self.point[1], self.point[2] * 2 - target.point[2]];
            const navigation = CompanionBehavior.navigate(context, away, 1.8);
            return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
        }
    });

    addPreferences("highjumpkick", {}, [
        field(pathOf("vertical"), "垂直落膝", "boolean", {
            help: "开启：几乎原地拔高、垂直下砸，膝劲 ×1.08、下坠更快、自伤 +0.06，但起手 +2 刻、冷却 +8 刻、射程 -1 格、顶点停滞更久（更容易被让开）。关闭：斜向飞膝，够得更远、更快、更轻。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标在这个距离以内才主动飞膝，否则先走近。越大越早发起，也越容易落在对手身后。"
        }),
        field(pathOf("ai.minSelf"), "最低自身血量", "number", {
            min: 0, max: 1, step: 0.05,
            help: "自身生命比例低于这个值时不再用飞膝（砸偏的自伤可能致命）。调高更保守，调低更愿意冒险。"
        })
    ]);
}
