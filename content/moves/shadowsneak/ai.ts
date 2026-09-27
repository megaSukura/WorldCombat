/**
 * 影子偷袭 / shadowsneak 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格内。同时用与招式相同的 SurfacePaths
 *   预测：从脚下真实地表到目标要有一条走得通的贴地路径（遇到断崖、实墙或水面会截停），而且目标的身体确实站在
 *   这条影子能到达的低处地面上——飞在空中的目标不选，不会隔墙点杀。更远交给共享接近逻辑走过去。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。
 * 选择偏好：`ai.preferBack`（默认开）时，目标此刻的**真实朝向**背离自己（把后背对着自己的方向）多一档分——
 *   这正是从背后下手的时机；朝向读不到或目标正对自己时不加分。
 * 优先次序：射程内基础 20；目标背对自己 +8；残血且 `ai.finish` 开 +16。
 * 够不到怎么办：射程由 `reach` 决定，共享任务把身位收进影子长度后再下刀。
 * 放完之后：第一只踩中影子的敌人背侧挨一刀；交回共享交战计划。
 */
namespace PokemonSkills {
    /** 影子能否从施法者脚下沿真实地面爬到目标、以及目标是否就站在这条影子的低处地面上；同一决策帧内缓存。 */
    function shadowsneakRoute(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "shadowsneak:route:" + target.ref, function () {
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const height = self.height === undefined ? 1.4 : self.height;
            const from = SurfacePaths.support(access,
                WorldCombat.point(self.point[0], self.point[1] - height / 2, self.point[2]), 0.6, 3);
            if (from === null) return false;
            const delta = CompanionBehavior.point(target.point).minus(from);
            const distance = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
            if (!(distance > 0.01)) return true;
            const step = SurfacePaths.advance(access, from, delta, distance,
                { up: 0.6, down: 1, spacing: 0.2, samples: Math.max(2, Math.ceil(distance / 0.2) + 1) });
            if (step.ended) return false;
            // 目标必须真的站在这条影子能走的低处地面上；用真实身体箱读脚底，而不是可能失真的 grounded 标记。
            const actor = access.actor(target.ref);
            const body = actor !== null ? access.observe(actor) : null;
            return body !== null && body.boundsMin().y() <= step.point.y() + 0.9;
        });
    }

    /** 目标此刻是否把后背朝向自己（真实朝向的点积，而不是它在打谁）。 */
    function shadowsneakTurnedAway(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        return CompanionBehavior.observedFlag(context, "shadowsneak:back:" + target.ref, function () {
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const actor = access.actor(target.ref);
            if (actor === null) return false;
            const look = WorldGeometry.facing(access, actor);
            if (look === null) return false;
            const flatLook = WorldCombat.point(look.x(), 0, look.z());
            const toSelf = WorldCombat.point(self.point[0] - target.point[0], 0, self.point[2] - target.point[2]);
            if (flatLook.length() < 0.05 || toSelf.length() < 0.05) return false;
            return WorldGeometry.dot(toSelf.unit(), flatLook.unit()) < -0.3;
        });
    }

    function shadowsneakWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
    }

    CompanionBehavior.registerUse(shadowsneakId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return shadowsneakWants(context, capability, target) && shadowsneakRoute(context, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !shadowsneakWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 20;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "preferBack", true) && shadowsneakTurnedAway(context, target)) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.3) score += 16;
            return score;
        }
    });

    addPreferences(shadowsneakId, {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才主动伸影子；影子会沿地面延伸，调大愿意从更外面先手。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于三成时优先补这一刀；关闭：只按普通候选排序。"
        }),
        field(pathOf("ai.preferBack"), "专挑背身", "boolean", {
            help: "开启：目标的实际朝向背离自己（把后背对着自己的方向）时优先从背侧下手；关闭：不区分目标朝向。"
        })
    ]);
}
