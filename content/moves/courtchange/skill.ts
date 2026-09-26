/** Flip explicitly portable fields at their real positions, retaining each producer's state and clock. */
namespace PokemonSkills {
    const courtChangeReferenceRadius = 4;
    export interface CourtChangeField { id: number; source: CombatActor; rule: string; radius: number; point: CombatPoint; friendly: boolean; tags: string[]; }
    export function courtChangeScan(world: CombatWorld, center: CombatPoint, radius: number): CourtChangeField[] {
        const result: CourtChangeField[] = [];
        WorldEffects.areas(world).forEach(area => {
            if (area.pending || !WorldEffects.areaTransferable(area)) return;
            const at = WorldAI.point(area.position), owner = world.actor(area.source);
            if (!owner || !world.valid(owner) || at.minus(center).length() > radius) return;
            result.push({ id: area.id, source: owner, rule: area.rule, radius: area.radius, point: at,
                friendly: world.friendly(owner), tags: area.tags });
        });
        return result;
    }

    function courtChangeNearestEnemy(world: CombatWorld, point: CombatPoint, radius: number): CombatActor | null {
        const actors = world.query(point, Math.min(32, Math.max(6, radius)), false);
        let best: CombatActor | null = null, bestDistance = Infinity;
        for (let index = 0; index < actors.length; index++) {
            const other = actors[index];
            if (world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.health() <= 0) continue;
            const distance = body.position().minus(point).length();
            if (distance >= bestDistance) continue;
            best = other; bestDistance = distance;
        }
        return best;
    }

    define({
        id: courtChangeId,
        cooldownParameter: "wait",
        name: "换场",
        description: "用念力扫过一片战场，把允许换主的场地效果对调归属：敌方的领域过户给我方，我方的领域过户给敌方。你会失去自己的领域，同时接管对方的；领域只换主人，规则、半径与剩余时长都不变。",
        uses: ["把敌人铺下的危险领域一记收过来", "在对方脚下翻转漩涡与禁锢", "用自己的旧领域换掉对方更有用的领域"],
        kind: "point",
        range: 6,
        maxRange: 10,
        prepare: 10,
        active: 0,
        recover: 6,
        cooldown: 120,
        style: "court",
        defaults: { swift: false },
        fields: [flag("swift", "速换")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(courtChangeId, "field", pokemon) : 4, geometry: "area", style: "court",
                color: 0xE07AD8, label: config && config.swift === true ? "换场 · 速换" : "换场 · 稳换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[courtChangeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(courtChangeId, "tempo", context)),
                recover: Math.round(p(courtChangeId, "aftercast", context)),
                cooldown: Math.round(p(courtChangeId, "wait", context)),
                active: 0,
                range: p(courtChangeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_courtchange:sigil", courtChangeScene, 1, action.origin(),
                JSON.stringify({ moment: "sigil", swift: config && config.swift === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor();
            const center = action.targetPosition();
            const radius = Math.max(2, p(courtChangeId, "field", action));
            const motes = Math.max(12, Math.round(p(courtChangeId, "motes", action)));
            const waves = Math.max(2, Math.min(5, Math.round(p(courtChangeId, "waves", action))));
            const scale = radius / courtChangeReferenceRadius;
            const fields = courtChangeScan(world, center, radius);
            const pathPoints: number[][] = [];
            let taken = 0, given = 0, refused = 0;
            for (let index = 0; index < fields.length; index++) {
                const entry = fields[index];
                const before = taken + given;
                if (entry.friendly) {
                    const enemy = courtChangeNearestEnemy(world, entry.point, radius + 6);
                    if (enemy !== null && WorldEffects.reassign(world, entry.id, enemy)) given++;
                    else refused++;
                } else {
                    if (WorldEffects.reassign(world, entry.id, actor)) taken++;
                    else refused++;
                }
                if (taken + given > before) pathPoints.push([entry.point.x(), entry.point.y(), entry.point.z()]);
            }

            if (taken + given > 0) WorldFeedback.emit(world, courtChangeScene, 1, center,
                { moment: "swap", path: pathPoints, motes: motes, waves: waves, fields: fields.length,
                    taken: taken, given: given, refused: refused, scale: scale,
                    intensity: Math.max(0.8, Math.min(1.8, 0.8 + fields.length / 3)) }, 44);
            if (taken + given === 0) {
                WorldFeedback.emit(world, courtChangeScene, 1, center,
                    { moment: "empty", motes: motes, scale: scale }, 24);
                WorldFeedback.text(world, center.plus(WorldCombat.point(0, 1.1, 0)), courtChangeEmptyText, [], 28);
            } else {
                WorldFeedback.text(world, center.plus(WorldCombat.point(0, 1.1, 0)), courtChangeSwapText, [taken, given], 32);
            }
            world.sound("minecraft:entity.evoker.cast_spell", center, 16, "{}");
            world.sound("minecraft:block.beacon.power_select", center, 12, "{}");
            done(action);
        }
    });
}
