/**
 * 火箭头锤的伙伴 AI 用途。
 *
 * 这招的 AI 围绕“站桩换重撞，而且墙是武器”：
 *   - `reach` 是冲撞距离：按 distance 参数（含深蓄/速收与体重的取舍）算，伙伴先由共用计划走到能一脚蹬到对手的位置再缩头；够不到就继续接近。
 *   - `available` 带着提案目标先过滤血线：生命低于 `ai.minHealth` 不收手（站桩会被打穿）。
 *   - `priority` 给防御蓄力本身一个基础分；目标已贴墙时再大幅抬价，越过共享顺序先撞、把墙撞开。
 *   - `ready` 要求自身与目标之间视线畅通——冲撞不会拐弯，隔墙就不值得开蹲（会等换位）。
 *   - `accepts` 只判断接受谁；`ai.maxChase` 是交战半径，超出才放弃接近。
 *   - 命中时 `skill.ts` 会先把目标沿冲撞方向压出去，再用它真实盒面是否贴墙决定墙撞；伙伴无需额外协议。
 *   - `ai.leaveStation` 控制驻守中的伙伴是否离位去撞。
 */
namespace CompanionBehavior {
    /** True when the target's body box already touches a block along the line from the companion to it. */
    function skullBashAligned(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), self = source(context), actor = access.actor(target.ref);
        const body = actor === null ? null : access.observe(actor);
        if (body === null) return false;
        const dx = body.position().x() - self.point[0], dz = body.position().z() - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return false;
        const direction = point([dx / length, 0, dz / length]);
        // 从目标真实盒面朝冲撞方向做短距方块射线：贴墙才算，墙在身后有缝隙不算；体型大的对手不会漏判。
        const min = body.boundsMin(), max = body.boundsMax();
        const halfX = (max.x() - min.x()) * 0.5, halfZ = (max.z() - min.z()) * 0.5;
        const lead = Math.abs(direction.x()) * halfX + Math.abs(direction.z()) * halfZ;
        const from = body.position().plus(direction.scale(Math.max(0, lead)));
        return WorldGeometry.blockHit(access, from, from.plus(direction.scale(0.4))) !== null;
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
        reach: function (context, item) {
            // 冲撞的实际长度由 distance 参数给出（含深蓄/速收与体重的取舍），AI 的接近距离按它算。
            const access = world(context), actor = access.source();
            let distance = 3;
            try {
                distance = Number(PokemonSkills.p("skullbash", "distance",
                    { world: access, actor: actor, skill: PokemonSkills.skills["skullbash"], detail: { values: item.data.config || {} } })) || 3;
            } catch (error) { }
            return Math.max(2.8, distance);
        },
        // 提案阶段先按血线过滤：带伤太轻时根本不把火箭头锤列为候选。
        available: function (context, item, _purpose, target) {
            if (!target) return true;
            return ratio(source(context)) >= ai<number>(item, "minHealth", 0.5);
        },
        // 防御蓄力本身就有价值（正面吸收、逼位）；目标已贴墙时更值得先撞，越过共享顺序。
        priority: function (context, _item, target) {
            if (!target) return 0;
            return skullBashAligned(context, target) ? 108 : 20;
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
