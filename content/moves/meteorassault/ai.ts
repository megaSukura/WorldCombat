/** Prefer several enemies in one narrow line or a slow single target, with room to recover. */
namespace PokemonSkills {
    /** 用本招真实半宽与被墙裁短的直线，数这一枪真正能贯到的敌人。 */
    function meteorassaultFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point);
        const direction = CompanionBehavior.point(target.point).minus(from);
        const unit = direction.length() > .01 ? direction.unit() : WorldCombat.point(0, 0, 1);
        const reach = Number(capability.data.range) || direction.length();
        const end = from.plus(unit.scale(reach));
        let half = .3;
        try {
            const values = { world: access, actor: access.source(), skill: PokemonSkills.skills["meteorassault"],
                detail: { values: capability.data.config || {} } };
            half = Math.max(.15, Math.min(.5, PokemonSkills.p("meteorassault", "arc", values)));
        } catch (error) { }
        // 中心线先被真实墙裁短；墙后的敌人不在这一枪的直线里。
        const wall = WorldGeometry.blockHit(access, from, end);
        const clipped = wall !== null ? wall.position().minus(from).length() : reach;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const rel = CompanionBehavior.point(other.point).minus(from);
            const forward = rel.x() * unit.x() + rel.y() * unit.y() + rel.z() * unit.z();
            if (forward < -half || forward > clipped + half) continue;
            const width = typeof other.width === "number" && isFinite(other.width) ? other.width : 0.6;
            if (rel.minus(unit.scale(forward)).length() <= half + width / 2) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("meteorassault", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > Math.max(8,capability.data.range*2)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.4);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth) return true;
            return CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const close = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            if (!close) return 0;
            const preferMultiple = CompanionBehavior.ai<boolean>(capability, "preferMultiple", true);
            const front = meteorassaultFront(context, capability, target);
            let score = preferMultiple && front >= 2 ? 52 : (CompanionBehavior.ratio(target) <= 0.3 ? 60 : 26);
            // 自身血线偏低时，即使目标是残血也压低这记重击的推荐——伸完的长力竭是自己要挨的。
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "minHealth", 0.4)) score -= 8;
            return score;
        }
    });

    addPreferences("meteorassault", {}, [
        field(pathOf("swings"), "伸枪段数", "number", {
            min: 2, max: 5, step: 1,
            help: "兵端分几段伸出；段数提高合并主伤，也延长动作与力竭。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动流星突击（除非目标已残）。越高越怕挥完被晃晕挨打。"
        }),
        field(pathOf("ai.preferMultiple"), "偏好群战", "boolean", {
            help: "开启：同一窄直线上有多个敌人时优先刺击；关闭：按单个目标判断。"
        })
    ]);
}
