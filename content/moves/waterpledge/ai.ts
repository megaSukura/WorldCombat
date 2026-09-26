/** 单水在当前脚边推开；已有草印时把湿地接在敌人的短前路，火印附近真有伤友才抬高彩虹价值。 */
namespace PokemonSkills {
    function waterpledgeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    interface WaterPledgeChoice { point: number[]; score: number; }

    function waterpledgeGround(world: CombatWorld, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity, at: CombatPoint): CombatPoint | null {
        const feet = target.point[1] - Math.max(0, Number(target.height) || 0) / 2;
        const hit = world.clipBlocks(WorldCombat.point(at.x(), feet + 1.1, at.z()), WorldCombat.point(at.x(), feet - 2, at.z()));
        if (!hit || !hit.blocked() || hit.blockFace() !== "up" || Math.abs(hit.position().y() - feet) > 1.05) return null;
        const ground = hit.position().plus(WorldCombat.point(0, 0.02, 0));
        const head = ground.plus(WorldCombat.point(0, Math.max(0.25, (Number(target.height) || 0.5) / 2), 0));
        if (!world.clear(CompanionBehavior.point(self.point), head) || !world.clear(CompanionBehavior.point(target.point), head)) return null;
        return ground;
    }

    /** Plain water still pushes at the current foot point; a grass seal can instead place wetland across the short route. */
    function waterpledgeChoice(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): WaterPledgeChoice | null {
        const key = "waterpledge:point:" + item.id + ":" + target.ref;
        if (Object.prototype.hasOwnProperty.call(context.scratch, key)) return context.scratch[key];
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const scope = { world: world, actor: world.source(), detail: { values: item.data.config || {} } };
        const prepare = Math.max(5, Math.round(p(waterpledgeId, "tempo", scope)));
        const detect = p(waterpledgeId, "comboDetect", scope);
        const comboRadius = Math.max(1, p(waterpledgeId, "markRadius", scope)) * p(waterpledgeId, "comboScale", scope);
        const velocity = target.velocity || CompanionBehavior.velocity(context, target);
        let dx = velocity ? (Number(velocity[0]) || 0) * prepare : 0, dz = velocity ? (Number(velocity[2]) || 0) * prepare : 0;
        const length = Math.sqrt(dx * dx + dz * dz), cap = Math.min(3, comboRadius);
        if (length > cap) { dx *= cap / length; dz *= cap / length; }
        const moving = Math.sqrt(dx * dx + dz * dz) > 0.15;
        const here = CompanionBehavior.point(target.point), candidates = moving ? [here, here.plus(WorldCombat.point(dx, 0, dz))] : [here];
        const areas = WorldEffects.areas(world), nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let best: WaterPledgeChoice | null = null;
        candidates.forEach(function (candidate, index) {
            const ground = waterpledgeGround(world, self, target, candidate);
            if (!ground) return;
            let combo = "", nearest = detect;
            for (let i = 0; i < areas.length; i++) {
                const area = areas[i], centre = CompanionBehavior.point(area.position), distance = centre.minus(ground).length();
                if (area.data.combo && distance <= 1 + area.radius) return;
                if (area.pending || area.remaining <= prepare) continue;
                if (area.rule !== "world_combat:field/pledge_fire" && area.rule !== "world_combat:field/pledge_grass") continue;
                if (distance <= nearest && world.clear(ground.plus(WorldCombat.point(0, 0.25, 0)), centre.plus(WorldCombat.point(0, 0.25, 0)))) {
                    nearest = distance;
                    combo = area.rule === "world_combat:field/pledge_fire" ? "rainbow" : "wetland";
                }
            }
            // A short leading point is useful for a grass combination, not a reason to postpone the ordinary push.
            if (index > 0 && combo !== "wetland") return;
            let score = combo ? 54 : 34;
            if (combo === "rainbow") {
                const friends = [self].concat(nearby);
                for (let i = 0; i < friends.length; i++) {
                    const friend = friends[i];
                    if (friend.ref !== self.ref && !friend.friendly || friend.health <= 0 || CompanionBehavior.ratio(friend) >= 0.9) continue;
                    if (CompanionBehavior.distance(friend.point, [ground.x(), ground.y(), ground.z()]) <= comboRadius
                        && world.clear(ground.plus(WorldCombat.point(0, 0.25, 0)), CompanionBehavior.point(friend.point))) { score = 58; break; }
                }
            } else if (combo === "wetland" && index > 0) score = 62;
            if (!best || score > best.score) best = { point: [ground.x(), ground.y(), ground.z()], score: score };
        });
        context.scratch[key] = best;
        return best;
    }

    CompanionBehavior.registerUse(waterpledgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return waterpledgeTarget(context, capability, target) && waterpledgeChoice(context, capability, target) !== null;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        target: function (context, capability, target) {
            const choice = waterpledgeChoice(context, capability, target);
            if (!choice) return null;
            const selected: CompanionBehavior.Entity = JSON.parse(JSON.stringify(target));
            selected.ref = ""; selected.point = choice.point.slice();
            return selected;
        },
        priority: function (context, capability, target) {
            if (!target || !waterpledgeTarget(context, capability, target)) return 0;
            const choice = waterpledgeChoice(context, capability, target);
            return choice ? choice.score : 0;
        }
    });

    addPreferences(waterpledgeId, { ai: { maxChase: 12 } }, [
        field(pathOf("deluge"), "涌誓", "boolean", {
            help: "开启（涌誓）：威力 ×1.10、誓约印 ×1.2、推开 ×1.25，但射程 ×0.9、冷却 +12——涌得更猛更大，却要站得更近、回手更慢。关闭（缓流）：射程 ×1.1、冷却 −4、推开 ×0.9——远、快、推得轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才立水柱，超过就先走近。"
        })
    ]);
}
