/**
 * 飞膝踢 / highjumpkick 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着、在 `ai.maxChase` 之内，且**自己生命比例不低于 `ai.minSelf`**——
 * 砸偏要按最大生命自伤，血太少时这一记可能把自己送走，所以低血时它会主动放弃、改用别的办法。
 * 起跳脚下与目标脚下都要有真实碰撞支撑；头顶要按整身体积与**本次公式算出的拔高**留得下净空（探针不可用
 * 或撞到方块都算不可用，不能把未知当开阔）。所需的拔高按体型与配置算出，不再写死一个数。
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
        const world = CompanionBehavior.world(context);
        const height = self.height || 1.4;
        // 真实起落支撑：起跳脚与目标脚都要有可落碰撞面。
        const selfFeet = CompanionBehavior.point([self.point[0], self.point[1] - height * 0.5, self.point[2]]);
        if (SurfacePaths.support(world, selfFeet, 0.7, 3) === null) return false;
        const targetFeet = CompanionBehavior.point([target.point[0], target.point[1] - (target.height || 1.4) * 0.5, target.point[2]]);
        if (SurfacePaths.support(world, targetFeet, 0.7, 6) === null) return false;
        // 按整身体积与本次真实拔高探净空；探针不可用(null)或撞到方块都不可用。
        const climb = p("highjumpkick", "leapHeight", { world: world, actor: world.source(), skill: skills["highjumpkick"],
            detail: { values: item.data.config || {} } });
        const head = CompanionBehavior.point([self.point[0], self.point[1] + height * 0.5, self.point[2]]);
        const ceiling = world.clipBlocks(head, head.plus(WorldCombat.point(0, climb + height + 0.4, 0)));
        return ceiling !== null && !ceiling.blocked();
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
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ratio(target) >= 0.7) score += 14;
            if (context.facts.focus === target.ref) score += 8;
            // 停顿或正在攻击的对手更值这一记重膝；高速横移的目标容易在滞空窗口里让开。
            if (target.attacking) score += 6;
            // 垂直落膝只近身砸：离得太远就不选这套模式，避免名义垂直却长距离斜飞。
            if (capability.data.config && capability.data.config.vertical === true) score -= Math.min(16, Math.max(0, gap - 2.2) * 4);
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
            help: "开启：几乎原地拔高、近身落膝，膝劲 ×1.08、下坠更快、自伤 +0.06，但起手 +2 刻、冷却 +8 刻、射程更短、顶点停滞更久（更容易被让开）。关闭：斜向飞膝，够得更远、更快、更轻。"
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
