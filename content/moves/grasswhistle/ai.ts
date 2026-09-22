/**
 * 草笛 的伙伴 AI 用途：这招自己的一套出手计划——先站成一条线，再一声扎穿。
 *
 * 什么局面有意义：挂在共享的 control／ranged 位上。有可见、敌对、还活着、没睡着、在 ai.maxChase 以内，
 *   且与自己之间有一条没被墙挡住的直线的目标时出手；同时它最想在有多个敌人排在一条线上时吹——音束会
 *   一路穿过去。已经被挡住视线或目标已睡着的，跳过。
 * 对谁出手：当前威胁；正在逃跑的威胁抬分（这一声能从远处把它钉住）。
 * 够不到怎么办：由共享任务走到 reach；accepts 不按距离硬拒，会先靠近再吹。
 * 放完之后：被穿透的一串人一起睡下；伙伴交回共享顺序，可以换个方向再吹一条线或转火。
 * 优先级：基础 42；音束里每多一个非友方 +8，上限 82；逃跑中的威胁再 +16。
 */
namespace PokemonSkills {
    /** 与参数公式同源的音束半宽估算（AI 只用体宽与配置；实际判定仍走招式自己的公式）。 */
    function grasswhistleHalf(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const width = self.width === undefined ? 0.9 : self.width;
        const narrow = !!(item.data.config && item.data.config.narrow);
        return Math.max(0.45, Math.min(1.8, (0.7 + Math.max(-0.15, Math.min(0.9, (width - 0.9) * 0.6))) * (narrow ? 0.7 : 1.4)));
    }

    /** 沿「自身→目标」的音束里站着几个非友方（含目标本身）。 */
    function grasswhistleInLane(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point);
        const to = CompanionBehavior.point(target.point);
        const delta = to.minus(from);
        if (delta.length() < 0.01) return 1;
        const reach = item.data.range && item.data.range > 0 ? item.data.range : 10;
        const lane = WorldGeometry.lane(from, delta, reach, grasswhistleHalf(context, item), { below: 2, above: 3 });
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (lane.contains(CompanionBehavior.point(other.point))) count++;
        }
        return count;
    }

    function grasswhistleWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "sleep")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse(grasswhistleId, {
        protocols: ["world_combat:control", "world_combat:ranged"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) { return target === null ? true : grasswhistleWants(context, item, target); },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !grasswhistleWants(context, item, target)) return 0;
            const lined = grasswhistleInLane(context, item, target);
            const flee = CompanionBehavior.fleeing(context, target) ? 16 : 0;
            return Math.min(82, 42 + lined * 8) + flee;
        }
    });

    addPreferences(grasswhistleId, { ai: { maxChase: 12, leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "吹奏距离", "number", {
            min: 3, max: 18, step: 1,
            help: "威胁在这个距离以外时就不主动吹，先走近；调大更愿意隔着一段距离先试一声。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会为吹笛离开原位；关闭则只在原地够得到时出手。"
        })
    ]);
}
