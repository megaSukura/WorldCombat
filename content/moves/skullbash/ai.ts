/**
 * 火箭头锤的伙伴 AI 用途。
 *
 * 这招的 AI 围绕“站桩换重撞，而且墙是武器”：
 *   - `reach` 是冲撞距离：伙伴先由共用计划走到能一脚蹬到对手的位置再缩头；够不到就继续接近。
 *   - `available` 带着提案目标先过滤血线：生命低于 `ai.minHealth` 不收手（站桩会被打穿）。
 *   - `priority` 在目标已被挤到墙前时返回 108：值得越过共享顺序先撞，把墙撞开。
 *   - `approach` 会利用地形：若目标背后是空地，就绕到它背对墙的一侧站定，让这一撞正对墙面。
 *   - `ready` 要求自身与目标之间视线畅通——冲撞不会拐弯，隔墙就不值得开蹲（会等换位）。
 *   - `accepts` 只判断接受谁；`ai.maxChase` 是交战半径，超出才放弃接近。
 *   - 命中时 `skill.ts` 会读目标背后是不是墙：是就追加威力、僵直并凿出一个会自己合拢的临时缺口；伙伴无需额外协议。
 *   - `ai.leaveStation` 控制驻守中的伙伴是否离位去撞。
 */
namespace CompanionBehavior {
    /** True when the target's back is against a block along the line from the companion to it. */
    function skullBashAligned(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), self = source(context), actor = access.actor(target.ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null) return false;
        const dx = body.position().x() - self.point[0], dz = body.position().z() - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const direction = point([dx / length, 0, dz / length]);
        return !access.clear(body.position(), body.position().plus(direction.scale(1.6)));
    }

    /** Stage on the side of the target opposite a nearby wall so the charge drives it into the wall. */
    function skullBashStage(context: WorldBehavior.Context, target: Entity, reach: number): number[] | null {
        const access = world(context), actor = access.actor(target.ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null || skullBashAligned(context, target)) return null;
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let i = 0; i < directions.length; i++) {
            const direction = point([directions[i][0], 0, directions[i][1]]);
            let wall = false;
            for (let step = 1; step <= 3 && !wall; step++) {
                if (!access.clear(body.position(), body.position().plus(direction.scale(step * 0.5)))) wall = true;
            }
            if (!wall) continue;
            const stage = body.position().minus(direction.scale(reach + 0.4));
            return [stage.x(), stage.y(), stage.z()];
        }
        return null;
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
        // 会用墙：没对准就先绕到目标背对墙的那一侧，再缩头。
        approach: function (context, _item, target, reach) {
            return skullBashStage(context, target, reach);
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
