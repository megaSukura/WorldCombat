/** 草柱按真实起手预判敌人的短前路，落点先核地面与墙；可接火/水印时保留共鸣优先，静止目标仍可直接受击。 */
namespace PokemonSkills {
    function grasspledgeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    interface GrassPledgeChoice { point: number[]; score: number; }

    /** A ground column must have a real upper block face, with a clear route from caster and moving target. */
    function grasspledgeGround(world: CombatWorld, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity, at: CombatPoint): CombatPoint | null {
        const feet = target.point[1] - Math.max(0, Number(target.height) || 0) / 2;
        const hit = world.clipBlocks(WorldCombat.point(at.x(), feet + 1.1, at.z()), WorldCombat.point(at.x(), feet - 2, at.z()));
        if (!hit || !hit.blocked() || hit.blockFace() !== "up" || Math.abs(hit.position().y() - feet) > 1.05) return null;
        const ground = hit.position().plus(WorldCombat.point(0, 0.02, 0));
        const head = ground.plus(WorldCombat.point(0, Math.max(0.25, (Number(target.height) || 0.5) / 2), 0));
        if (!world.clear(CompanionBehavior.point(self.point), head) || !world.clear(CompanionBehavior.point(target.point), head)) return null;
        return ground;
    }

    /** Prefer the target's short next step; an available fire/water pledge keeps its existing combination priority. */
    function grasspledgeChoice(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): GrassPledgeChoice | null {
        const key = "grasspledge:point:" + item.id + ":" + target.ref;
        if (Object.prototype.hasOwnProperty.call(context.scratch, key)) return context.scratch[key];
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const scope = { world: world, actor: world.source(), detail: { values: item.data.config || {} } };
        const prepare = Math.max(5, Math.round(p(grasspledgeId, "tempo", scope)));
        const radius = Math.max(1, p(grasspledgeId, "pillarRadius", scope));
        const detect = p(grasspledgeId, "comboDetect", scope);
        const velocity = target.velocity || CompanionBehavior.velocity(context, target);
        let dx = velocity ? (Number(velocity[0]) || 0) * prepare : 0, dz = velocity ? (Number(velocity[2]) || 0) * prepare : 0;
        const length = Math.sqrt(dx * dx + dz * dz), cap = Math.min(2.5, radius);
        if (length > cap) { dx *= cap / length; dz *= cap / length; }
        const moving = Math.sqrt(dx * dx + dz * dz) > 0.15;
        const here = CompanionBehavior.point(target.point), candidates = moving ? [here.plus(WorldCombat.point(dx, 0, dz)), here] : [here];
        const areas = WorldEffects.areas(world);
        let best: GrassPledgeChoice | null = null;
        candidates.forEach(function (candidate, index) {
            const ground = grasspledgeGround(world, self, target, candidate);
            if (!ground) return;
            let combo = false;
            for (let i = 0; i < areas.length; i++) {
                const area = areas[i], centre = CompanionBehavior.point(area.position), distance = centre.minus(ground).length();
                if (area.data.combo && distance <= 1 + area.radius) return;
                if (area.pending || area.remaining <= prepare) continue;
                if (area.rule !== "world_combat:field/pledge_fire" && area.rule !== "world_combat:field/pledge_water") continue;
                if (distance <= detect && world.clear(ground.plus(WorldCombat.point(0, 0.25, 0)), centre.plus(WorldCombat.point(0, 0.25, 0)))) combo = true;
            }
            const intercept = moving && index === 0;
            const score = combo ? 54 : intercept ? 42 : 34;
            if (!best || score > best.score) best = { point: [ground.x(), ground.y(), ground.z()], score: score };
        });
        context.scratch[key] = best;
        return best;
    }

    CompanionBehavior.registerUse(grasspledgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return grasspledgeTarget(context, capability, target) && grasspledgeChoice(context, capability, target) !== null;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, target) {
            const choice = grasspledgeChoice(context, capability, target);
            if (!choice) return null;
            const selected: CompanionBehavior.Entity = JSON.parse(JSON.stringify(target));
            selected.ref = ""; selected.point = choice.point.slice();
            return selected;
        },
        priority: function (context, capability, target) {
            if (!target || !grasspledgeTarget(context, capability, target)) return 0;
            const choice = grasspledgeChoice(context, capability, target);
            return choice ? choice.score : 0;
        }
    });

    addPreferences(grasspledgeId, { ai: { maxChase: 12 } }, [
        field(pathOf("entangle"), "缠誓", "boolean", {
            help: "开启（缠誓）：缠住时长 ×1.5、誓约印 ×0.8、冷却 +10——锁人优先。关闭（茂誓）：威力 ×1.06、誓约印 ×1.2、冷却更短——打得重、地面留得久。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才立草柱，超过就先走近。"
        })
    ]);
}
