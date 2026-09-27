/**
 * 加农光炮 / flashcannon —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 16）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：`ai.lineUp`（默认开）且当前是贯穿形态时，若目标身后同一条三维弹路上还有别的敌人，抬高优先级——
 *   一发扫掉一排正是它最值的时候；弹路按本次真实弹径与每个候选的真实碰撞箱做线段相交，只数实际射程内、
 *   看得见、且确实排在目标身后的敌人，最多计 2 个后续目标（高瘦目标按真实高度参与，首目标体宽不放大弹路）。
 *   集束形态不穿透，只按普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再射。
 * 放完接什么：交回共享交战计划；光矛不留场，不改变后续决策。
 */
namespace PokemonSkills {
    /** 本招当前真实弹径：用行动携带的偏好配置求值，和真正施放时的 radius 一致。 */
    function flashcannonLanceRadius(context: WorldBehavior.Context, capability: any): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(0.2, Math.min(0.42, p("flashcannon", "radius",
                { world: world, actor: world.source(), detail: { values: capability.data.config } })));
        } catch (error) {
            return 0.24;
        }
    }

    /**
     * 目标身后、真正落在 self→target 这条三维弹路上、在射程内且通视的敌人数。
     * 弹路是一条以本次真实弹径为半径、沿准线扫到射程的线段，逐个与候选的真实碰撞箱做线段相交；
     * 首目标的体宽不再放大后续弹路，高瘦目标按其真实高度参与相交。最多只计贯穿形态能穿过的 2 个后续目标。
     */
    function flashcannonLined(context: WorldBehavior.Context, capability: any, target: WorldMethods.Subject): number {
        const self = CompanionBehavior.source(context), world = CompanionBehavior.world(context);
        const config = capability.data.config || {};
        // 贯穿形态固定穿透 2 个后续目标（focus 为 0），与本招 parameters.ts 的 pierce 一致。
        const pierce = config.focus === true ? 0 : 2;
        if (pierce <= 0) return 0;
        const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
        const delta = to.minus(from), length = delta.length();
        if (length < 0.5) return 0;
        const heading = delta.unit();
        const reach = typeof capability.data.range === "number" && isFinite(capability.data.range) && capability.data.range > 0
            ? capability.data.range : length;
        const lane = WorldGeometry.bodySegment(from, from.plus(heading.scale(Math.max(length, reach))),
            flashcannonLanceRadius(context, capability));
        let count = 0;
        WorldGeometry.selectBodies(world, lane, function (other, body) {
            if (count >= pierce) return;
            const ref = String(other.ref());
            if (ref === self.ref || ref === target.ref) return;
            if (body.friendly() || body.health() <= 0 || !body.visible()) return;
            const offset = body.position().minus(from);
            const along = offset.x() * heading.x() + offset.y() * heading.y() + offset.z() * heading.z();
            if (along <= length + 0.5) return;
            if (reach > 0 && body.position().minus(from).length() > reach) return;
            if (!world.clear(from, body.position())) return;
            count++;
        });
        return count;
    }

    CompanionBehavior.registerUse("flashcannon", {
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
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 21 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "lineUp", true)
                && flashcannonLined(context, capability, target) > 0) score += 14;
            return score;
        }
    });

    addPreferences("flashcannon", {}, [
        field(pathOf("focus"), "集束形态", "boolean", {
            help: "开启：威力 ×1.2、只命中第一个目标、冷却 −3 刻，适合点名单体。关闭（贯穿）：威力 ×0.92、可穿透 2 个后续目标（逐个衰减）、冷却 +3 刻，适合扫一条线。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 5, max: 26, step: 1,
            help: "超过这个距离就不主动起手，先走近；越大越愿意在更远处先收光。"
        }),
        field(pathOf("ai.lineUp"), "瞄准排成一线的", "boolean", {
            help: "开启后，贯穿形态下目标身后同一条三维弹路上（按本次真实弹径扫掠、逐个体碰撞箱判定）还挡着别的敌人时抬高优先级（最多按能穿透的 2 个后续目标计）；集束形态或不看排队时按普通远程攻击排序。"
        })
    ]);
}
