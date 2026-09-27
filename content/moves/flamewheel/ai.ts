/**
 * 火焰轮 / flamewheel 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内。它没有反伤，是最便宜的一滚，
 * 所以门槛低——只要有目标就愿意滚。自身被冻住时不再看这个距离：滚动是直接位移，正好借这团火把自己化开。
 * 对谁出手：`ai.preferIgnite`（默认开）时，还没被点着的目标排前面；`ai.preferCrowd`（默认开）时，
 * 用真实的水平滚线和轮径（本个体公式算出的 roll/radius/pierceCount）数**真的在滚线上**的非友方，
 * 而不是只看目标身边挤着多少人——侧面的人堆不在滚线上就不算收益。
 * 够不到怎么办：先按共享接近逻辑走近到 reach 之内。
 * 放完之后：一路滚过去，接着按共享交战计划继续追击或收势。
 */
namespace PokemonSkills {
    function flamewheelValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 目标之外，还有几个非友方真的落在这一次的水平滚线上（受碾过上限约束），其中几个尚未灼伤。 */
    function flamewheelLane(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): { crowd: number; ignitable: number } {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point), goal = CompanionBehavior.point(target.point);
        const delta = goal.minus(from);
        if (delta.length() < 0.05) return { crowd: 0, ignitable: 0 };
        const values = { world: world, actor: world.source(), detail: { values: capability.data.config || {} } };
        const length = Math.max(0.5, p("flamewheel", "roll", values));
        const half = Math.max(0.3, p("flamewheel", "radius", values));
        const limit = Math.max(1, Math.round(p("flamewheel", "pierceCount", values)));
        let crowd = 0, ignitable = 0;
        try {
            WorldGeometry.selectBodies(world, WorldGeometry.bodyLane(from, delta, length, half), function (actor, facts) {
                if (facts.friendly()) return;
                if (String(actor.ref()) === String(target.ref)) return;
                if (crowd >= limit - 1) return;
                crowd++;
                if (!CombatStatus.has(world, actor, "burn")) ignitable++;
            });
        } catch (ignored) { }
        return { crowd: crowd, ignitable: ignitable };
    }

    CompanionBehavior.registerUse("flamewheel", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!flamewheelValid(target)) return false;
            // 冻着的时候允许起手：滚出去就能化冰，不必先等目标进入滚动距离。
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), "frozen")) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) { return flamewheelValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const range = capability.data.range;
            const distance = CompanionBehavior.distance(self.point, target.point);
            const frozen = CompanionBehavior.status(context, self, "frozen");
            if (!frozen && distance > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return 0;
            let score = 22;
            if (frozen) score += 20;
            if (CompanionBehavior.ai<boolean>(capability, "preferIgnite", true) && !CompanionBehavior.status(context, target, "burn")) score += 14;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) {
                const lane = flamewheelLane(context, capability, target);
                score += Math.min(18, lane.crowd * 8);
                if (CompanionBehavior.ai<boolean>(capability, "preferIgnite", true)) score += Math.min(10, lane.ignitable * 4);
            }
            if (distance <= range) score += 4;
            return score;
        }
    });

    addPreferences("flamewheel", {}, [
        field(pathOf("fierce"), "烈焰轮", "boolean", {
            help: "开启：灼伤概率与时长显著提高、火星更多、滚得更慢更短——把滚动换成持续点燃。关闭（疾风轮）：威力、滚动距离与滚动速度更高、节奏更快，但几乎不点着对手，更适合滚过一串人清场。"
        }),
        field(pathOf("ai.maxChase"), "滚动距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动起滚，先靠近。射程本就不长，设大也常常轮不到。"
        }),
        field(pathOf("ai.preferIgnite"), "优先点燃未着火目标", "boolean", {
            help: "开启：还没被点着的目标排前面，把火轮的作用铺开；关闭则只按普通近战排序。"
        }),
        field(pathOf("ai.preferCrowd"), "优先朝人堆滚", "boolean", {
            help: "开启：滚线上挤着越多敌人越优先——火轮会碾过挡在路上的一串人；关闭则只盯着单个目标。"
        })
    ]);
}
