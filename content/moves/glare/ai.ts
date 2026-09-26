/**
 * 大蛇瞪眼 / Glare — 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 control 位上；带瞪眼的伙伴在没有攻击可用时用它。对还没被麻痹、可见、敌对、
 *   还活着、在 ai.maxChase 以内、与施法者通视的目标昂首；已经麻痹的目标不重复下手。
 * 对谁出手：当前威胁。它最爱面前挤着一群的时候——以目标方向为中线，按本个体真实的扇面张角、射程和通视，
 *   扇形一次真能罩住好几个。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒，会先靠近再瞪。
 * 放完之后：圈里所有人一起变慢、有 25% 概率失手，伙伴交回共享顺序继续交战。
 * 优先级：ai.preferCrowd 开启时，实际扇形里每多一个敌人就 +8，最高 85；孤立目标只给 45。
 *   电属性的目标对麻痹免疫，直接跳过，把机会留给别的控制手段。
 */
namespace PokemonSkills {
    /** 电属性对麻痹免疫，别浪费这一记。 */
    function glareElectric(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const facts = CompanionBehavior.pokemonFacts(context, target);
        return !!facts && facts.types.indexOf("electric") >= 0;
    }

    /** 以目标方向为中线，数一数本个体真实扇面（张角、射程、通视）里挤着几个非友方（含目标）。 */
    function glareFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 6;
        const angle = p(glareId, "gazeAngle", world);
        const cosHalf = Math.cos(Math.min(180, Math.max(5, angle)) * Math.PI / 360);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        if (span < 1e-6) return 1;
        const ux = dx / span, uz = dz / span, from = CompanionBehavior.point(self.point);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible || other.ref === String(context.actor)) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > reach || distance < 1e-6) continue;
            if ((ox / distance) * ux + (oz / distance) * uz < cosHalf - 1e-12) continue;
            if (!world.clear(from, CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(glareId, {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.status(context, target, "paralysis")) return false;
            if (glareElectric(context, target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 7)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || CompanionBehavior.status(context, target, "paralysis") || glareElectric(context, target)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) return 50;
            const crowd = glareFront(context, capability, target);
            return Math.min(85, 45 + Math.max(0, crowd - 1) * 8);
        }
    });

    addPreferences(glareId, {}, [
        field(pathOf("spread"), "张冠", "boolean", {
            help: "开启：张角 ×1.35、起手少 2 刻、冷却 ×0.9，但射程 ×0.85、麻痹 ×0.85，用来一次镇住围上来的一群；关闭：昂首式，张角 ×0.7、射程 ×1.15、麻痹 ×1.2，用来隔远把单个硬目标钉住。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动瞪眼，先走近。越大越执着接近，也越容易在扇形之外空瞪。"
        }),
        field(pathOf("ai.preferCrowd"), "优先人多的一侧", "boolean", {
            help: "开启后，实际扇形（张角、射程、通视）里每多一个敌人优先级 +8（最高 85），先镇住人堆；关闭则所有威胁一视同仁。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为瞪眼离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
