/**
 * 龙之波动 / dragonpulse 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一道沿直线前进的波，所以 `ai.preferLine`（默认开）在「自己 → 目标」这条**真实 3D 线**的后方
 * 还有别的敌人、且从首目标到它能被同一道波通视扫到时把它排到前面——上下楼层或隔墙的敌人不算同线；
 * 关闭则只当一记普通远程法术用。
 * 同线半宽读本个体**当前实际公式**：连锁式用 `burstRadius`、贯通式用 `thickness`（PokemonSkills.p
 * 以现场 world/actor 与本招配置求值），不是固定近似；公式取不到就不加同线分。
 * 连锁式与贯通式不改变出手条件，只改变波的作用形状，由配置承担。
 */
namespace PokemonSkills {
    /** 本个体、当前配置下这一招的真实参数值；读不到返回 NaN（不在命中判断里用近似常数）。 */
    function dragonpulseAiValue(context: WorldBehavior.Context, capability: WorldBehavior.Capability, key: string): number {
        const world = CompanionBehavior.world(context);
        try {
            const base: FactContext = { world: world, actor: world.source(),
                skill: skills["dragonpulse"], detail: { values: capability.data.config || {} } };
            const value = p("dragonpulse", key, base);
            return typeof value === "number" && isFinite(value) ? value : NaN;
        } catch (error) { return NaN; }
    }

    /** 另一个敌人是否落在这条真实 3D 线的窄带内、比目标更远，且从目标到它之间没有墙。 */
    function dragonpulseOnLine(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject,
        other: WorldMethods.Subject, reach: number, halfWidth: number): boolean {
        const a = CompanionBehavior.point(self.point), b = CompanionBehavior.point(target.point), c = CompanionBehavior.point(other.point);
        const ab = b.minus(a), length = ab.length();
        if (length < 0.01) return false;
        const forward = ab.unit(), ac = c.minus(a);
        const along = ac.x() * forward.x() + ac.y() * forward.y() + ac.z() * forward.z();
        if (along <= length + 0.3 || along > reach) return false;
        if (ac.minus(forward.scale(along)).length() > halfWidth) return false;
        return CompanionBehavior.world(context).clear(b, c);
    }

    CompanionBehavior.registerUse("dragonpulse", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const reach = capability.data.range;
            if (CompanionBehavior.distance(self.point, target.point) > reach) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferLine", true)) {
                const chain = !!(capability.data.config && capability.data.config.chain === true);
                // 真实 3D 半宽：连锁式看收束后的线宽，贯通式看波面厚度；公式取不到就不加同线分。
                const halfWidth = dragonpulseAiValue(context, capability, chain ? "burstRadius" : "thickness");
                if (isFinite(halfWidth) && halfWidth > 0) {
                    let lined = 0;
                    const nearby: WorldMethods.Subject[] = context.facts.nearby || [];
                    for (let i = 0; i < nearby.length; i++) {
                        const other = nearby[i];
                        if (other.friendly || other.health <= 0 || !other.visible || other.ref === target.ref) continue;
                        if (dragonpulseOnLine(context, self, target, other, reach, halfWidth)) lined++;
                    }
                    if (lined >= 1) score += 8 + Math.min(16, lined * 6);
                }
            }
            return score;
        }
    });

    addPreferences("dragonpulse", {}, [
        field(pathOf("chain"), "连锁式", "boolean", {
            help: "开启：波在碰到第一个敌人时收束，再沿同一条线逐段扫过后续目标、每级威力递减（墙会截断，不再前进）；关闭：贯通式，波沿直线以完整威力继续穿过后面的敌人。连锁式吃一条衰减的链，贯通式吃一列硬伤。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不出手，先走近。越大越会在更远处先手推波。"
        }),
        field(pathOf("ai.preferLine"), "成列时优先", "boolean", {
            help: "开启：目标后方还排着别的敌人、且在同一道 3D 波线上能被扫到时优先出手（上下错位或隔墙不算，可能为找线偏离站位）；关闭：只当普通远程法术用。"
        })
    ]);
}
