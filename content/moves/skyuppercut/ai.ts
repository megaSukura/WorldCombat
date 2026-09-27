/**
 * 冲天拳 / skyuppercut 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在 `ai.maxChase`（默认 5）格内；拳程短，够不到先让共享接近逻辑送进来。
 * 对谁出手：用这条真实上勾弧能接触到的空敌优先——按身体表面距离估拳程、按目标身体上下沿估竖直覆盖，而不是
 * 只看中心球距；弧够不到的高空目标不因“离地”就加分。`ai.finish` 收残血。地面近敌时也出，把它挑离阵地给下一拍。
 * 放完之后：对手被顶到空中，交回共享计划决定追着打还是先走位。
 *
 * 接近距离取实际射程（共享任务还会再乘一次接近系数），上勾要贴进去才能在拳程内挑到人。
 */
namespace PokemonSkills {
    /** 身体表面距离：中心距减去两边半个身宽，宽体 Boss 的拳程按真实体表算。 */
    function skyuppercutSurfaceDistance(self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): number {
        const radii = (self.width !== undefined ? self.width : 0.9) * 0.5 + (target.width !== undefined ? target.width : 0.9) * 0.5;
        return Math.max(0, CompanionBehavior.distance(self.point, target.point) - radii);
    }

    /** 真实上勾弧能否碰到这个目标的身体：横向在拳程内，且目标身体上下沿与弧的竖直范围有重叠。 */
    function skyuppercutArcReaches(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const reach = Number(p("skyuppercut", "reach", world));
        const airReach = Number(p("skyuppercut", "airReach", world));
        if (!isFinite(reach) || !isFinite(airReach)) return target.grounded === false;
        const self = CompanionBehavior.source(context);
        const horizontal = skyuppercutSurfaceDistance(self, target);
        if (horizontal > reach + 0.35) return false;
        const targetHeight = target.height !== undefined ? target.height : 1.4;
        const dy = target.point[1] - self.point[1];
        return dy + targetHeight * 0.5 >= -0.5 && dy - targetHeight * 0.5 <= airReach;
    }

    function skyuppercutWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return skyuppercutSurfaceDistance(CompanionBehavior.source(context), target)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
    }

    /** 接近距离取实际射程（共享任务还会再乘一次接近系数），上勾要贴进去才能在拳程内挑到人。 */
    function skyuppercutApproach(capability: WorldBehavior.Capability): number {
        const range = Number(capability.data.range);
        return isFinite(range) && range > 0 ? range : 1.9;
    }

    CompanionBehavior.registerUse("skyuppercut", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return skyuppercutApproach(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return skyuppercutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !skyuppercutWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const surface = skyuppercutSurfaceDistance(self, target);
            if (surface > capability.data.range) return 0;
            let score = 22;
            if (CompanionBehavior.ai<boolean>(capability, "punishAir", true) && target.grounded === false
                && skyuppercutArcReaches(context, capability, target)) score += 9;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.4) score += 6;
            return score;
        }
    });

    addPreferences("skyuppercut", {}, [
        flag("rising", "冲天式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.punishAir", "优先空中目标"),
        flag("ai.finish", "优先收残血")
    ]);
}
