/**
 * 火箭头锤的伙伴 AI 用途。
 *
 * 这招的 AI 围绕“站桩换重撞，而且墙是武器”：
 *   - `reach` 是冲撞距离：伙伴先由共用计划走到能一脚蹬到对手的位置再缩头；够不到就继续接近。
 *   - `available` 带着提案目标先过滤血线：生命低于 `ai.minHealth` 不收手（站桩会被打穿）。
 *   - `priority` 在目标已被挤到墙前时返回 108：值得越过共享顺序先撞，把墙撞开。
 *   - `ready` 要求自身与目标之间视线畅通——冲撞不会拐弯，隔墙就不值得开蹲（会等换位）。
 *   - `accepts` 只判断接受谁；`ai.maxChase` 是交战半径，超出才放弃接近。
 *   - 命中时 `skill.ts` 会先沿冲撞方向把目标压出去，再按它实际身体是否贴到墙决定墙撞；伙伴无需额外协议。
 *   - `ai.leaveStation` 控制驻守中的伙伴是否离位去撞。
 */
namespace CompanionBehavior {
    /** True when the target's body is already pressed against a block along the line from the companion to it. */
    function skullBashAligned(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), self = source(context), actor = access.actor(target.ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null) return false;
        const dx = body.position().x() - self.point[0], dz = body.position().z() - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const direction = point([dx / length, 0, dz / length]);
        // 只有身体真的贴着墙才算对准：短距方块射线，墙在身后有缝隙时不算。
        const reach = Math.max(0.25, body.width() * 0.5 + 0.2);
        return !access.clear(body.position(), body.position().plus(direction.scale(reach)));
    }

    const skullBashHealth = PokemonSkills.number("ai.minHealth", "最低血线", 0.15, 0.9, 0.05);
    skullBashHealth.help = "伙伴生命低于这个比例就不会蹲桩蓄力；调高更保守，调低愿意带伤硬撞。";
    const skullBashChase = PokemonSkills.number("ai.maxChase", "交战半径", 2, 20, 1);
    skullBashChase.help = "伙伴在多少格内愿意蓄力冲撞过去；调小只在近旁撞，调大愿意追出去拦截。";
    const skullBashLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    skullBashLeave.help = "开启后，驻守中的伙伴会离开原位去撞进入交战半径的敌人。";

    PokemonSkills.addPreferences("skullbash", { ai: { minHealth: 0.5, maxChase: 16, leaveStation: false } }, [skullBashHealth, skullBashChase, skullBashLeave]);

    registerUse("skullbash", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (_context, item) {
            const distance = item.data.config && typeof item.data.config.distance === "number" ? item.data.config.distance : 3;
            return Math.max(2.8, distance);
        },
        // 提案阶段先按血线过滤：带伤太轻时根本不把火箭头锤列为候选。
        available: function (context, item, _purpose, target) {
            if (!target) return true;
            return ratio(source(context)) >= ai<number>(item, "minHealth", 0.5);
        },
        // 目标已经被挤到墙前时最值得先撞：越过共享顺序，把墙撞开。
        priority: function (context, _item, target) {
            return target && skullBashAligned(context, target) ? 108 : 0;
        },
        ready: function (context, _item) {
            const goal = goalEntity(context);
            if (!goal) return true;
            const self = source(context);
            return world(context).clear(point(self.point), point(goal.point));
        },
        accepts: function (context, item, target) {
            if (target.friendly || !target.visible || target.health <= 0) return false;
            if (context.facts.focus !== target.ref && distance(source(context).point, target.point) > ai<number>(item, "maxChase", 16)) return false;
            return true;
        }
    });
}
