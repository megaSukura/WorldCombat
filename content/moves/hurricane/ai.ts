/**
 * 暴风 / hurricane 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一道会走的风墙，所以 `ai.preferLines`（默认开）让它在“自己→目标”这条线上还串着别的敌人时把它
 * 排到前面——一道风能把线上的目标一起卷走；串人判断用本招实际解析出的涡径与高度带，并排除被墙隔开的目标，
 * 代价是可能为了找直线离开更好的站位，关闭则只盯当前目标。
 * 下雨时风更稳更宽、更容易卷晕，priority 也略微抬高。用完风会走到终点，剩下的距离交回共享顺序。
 */
namespace PokemonSkills {
    /** 本招当前解析出的风墙半径（与执行同源），供线路判断使用。 */
    function hurricaneWidth(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        const values: FactContext = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        const value = p("hurricane", "vortexRadius", values);
        return isFinite(value) ? Math.max(1.2, Math.min(5.0, value)) : 2.6;
    }

    /** “自己→目标”这条线段在横向 `width` 内串着 `other`，且两者都与风墙同层、没有墙隔开。 */
    function hurricaneOnLine(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject,
                             other: WorldMethods.Subject, width: number): boolean {
        const ax = self.point[0], ay = self.point[1], az = self.point[2];
        const bx = target.point[0], bz = target.point[2];
        const dx = bx - ax, dz = bz - az, lengthSq = dx * dx + dz * dz;
        if (lengthSq < 0.01) return false;
        const t = Math.max(0, Math.min(1, ((other.point[0] - ax) * dx + (other.point[2] - az) * dz) / lengthSq));
        const px = ax + dx * t, pz = az + dz * t;
        const ox = other.point[0] - px, oz = other.point[2] - pz;
        if (Math.sqrt(ox * ox + oz * oz) > width) return false;
        // 高度带：和风墙同层（约 ±4 格）才卷得到，楼下与高处不算。
        if (Math.abs(other.point[1] - ay) > 4 || Math.abs(target.point[1] - ay) > 4) return false;
        const world = CompanionBehavior.world(context), from = CompanionBehavior.point(self.point);
        if (WorldGeometry.blockHit(world, from, CompanionBehavior.point(other.point)) !== null) return false;
        return WorldGeometry.blockHit(world, from, CompanionBehavior.point(target.point)) === null;
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
                const width = hurricaneWidth(context, capability);
                const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (other.friendly || other.health <= 0 || other.ref === target.ref || !other.visible) continue;
                    if (CompanionBehavior.distance(other.point, self.point) > capability.data.range * 1.4) continue;
                    if (hurricaneOnLine(context, self, target, other, width)) lined++;
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
            help: "开启：用本招实际涡径与高度带判断一条线上还串着几个可达敌人（排除被墙隔开的），串得越多越优先起风，可能为找线离开更好站位；关闭：只认当前目标的直线。"
        })
    ]);
}
