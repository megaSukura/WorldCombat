/**
 * 暴风 / hurricane 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一道会走的风墙，所以 `ai.preferLines`（默认开）让它在“自己→目标”这条线上还串着别的敌人时把它
 * 排到前面——一道风能把线上的目标一起卷走；代价是可能为了找直线离开更好的站位，关闭则只盯当前目标。
 * 下雨时风更稳更宽、更容易卷晕，priority 也略微抬高。用完风会走到终点，剩下的距离交回共享顺序。
 */
namespace PokemonSkills {
    /** 其他敌人到“自己→目标”这条线段的横向距离，用来估这条线上串了几个人。 */
    function hurricaneOnLine(self: WorldMethods.Subject, target: WorldMethods.Subject, other: WorldMethods.Subject, width: number): boolean {
        const ax = self.point[0], az = self.point[2], bx = target.point[0], bz = target.point[2];
        const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
        if (lengthSq < 0.01) return false;
        const t = Math.max(0, Math.min(1, ((other.point[0] - ax) * dx + (other.point[2] - az) * dz) / lengthSq));
        const px = ax + dx * t, pz = az + dz * t;
        const ox = other.point[0] - px, oz = other.point[2] - pz;
        return Math.sqrt(ox * ox + oz * oz) <= width;
    }

    function hurricaneRain(context: WorldBehavior.Context): boolean {
        const world = CompanionBehavior.world(context);
        if (!world) return false;
        const body = world.observe(world.source());
        if (body === null) return false;
        const env = WorldEnvironment.read(world, body.position());
        return !!env && typeof env.rain === "number" && env.rain > 0.2;
    }

    CompanionBehavior.registerUse("hurricane", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferLines", true)) {
                let lined = 0;
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || other.ref === target.ref || !other.visible) continue;
                    if (CompanionBehavior.distance(other.point, self.point) > capability.data.range * 1.4) continue;
                    if (hurricaneOnLine(self, target, other, 3.0)) lined++;
                }
                score += Math.min(30, lined * 10);
            }
            if (hurricaneRain(context)) score += 10;
            return score;
        }
    });

    addPreferences("hurricane", {}, [
        field(pathOf("tight"), "收束式", "boolean", {
            help: "开启：涡径更小，但风威更高、走得更快、混乱概率更高，冷却更长——用来点杀一条线上的重点目标。关闭：广域式，覆盖更宽、把目标抛得更远，但单点更轻、冷却更短。"
        }),
        field(pathOf("ai.maxChase"), "施放距离", "number", {
            min: 4, max: 24, step: 1,
            help: "超过这个距离就不起风，先走近。越大越愿意在远处先手放出一道风墙。"
        }),
        field(pathOf("ai.preferLines"), "找直线机会", "boolean", {
            help: "开启：一条线上还串着别的敌人时优先起风（一道风卷走一排），可能为了找线离开更好站位；关闭：只认当前目标的直线。"
        })
    ]);
}
