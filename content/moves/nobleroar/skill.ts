/**
 * 战吼 / nobleroar 的执行组织。
 *
 * 核心念头：站定，把胸一挺，一声低吼像一堵墙从正面推出去。锥形里所有敌人都被压住气势——物攻与特攻一起下降，
 * 越近越深；声波不挑人，站在锥里的人都会听见。
 *
 * 两幕：
 *   起（windup 播「吸气」，提交前只观察与预告，可被打断，打断不花代价）。
 *   吼（提交后）：以施法者为顶点、朝瞄准方向张开 `arc` 度、推出 `reach` 格；
 *     `WorldGeometry.sector` 选出锥内所有非友方，逐个 NativeEffects.boost 掉物攻与特攻（怒吼 1 级／低吼 2 级），
 *     并挂上共享身份 world_combat:status/cowed 的「气短」标记；表现用的锥形顶点与判定读同一份形状。
 *
 * 与同族分开：本组里唯一作用于身前一片、且唯一的声波招；其余三招都只碰自己人。
 */
namespace PokemonSkills {
    const nobleroarScene = "world_combat:move_nobleroar";
    const nobleroarCowed = "world_combat:cowed";
    const nobleroarHitText = "world_combat.move.nobleroar.text.hit";
    const nobleroarMissText = "world_combat.move.nobleroar.text.miss";

    /** 以施法者为顶点、朝方向张开 arc 度的锥形地面顶点；判定（sector）与表现（polygon）读同一份形状。 */
    function nobleroarCone(origin: CombatPoint, heading: CombatPoint, reach: number, arc: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (arc * Math.PI / 180) / 2, steps = 8;
        const vertices: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * reach, origin.y(), origin.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    /** 把瞄准方向压到水平面；锥体与声压都按地面朝向推出去。 */
    function nobleroarHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: "nobleroar",
        name: "Noble Roar",
        description: "发出战吼威吓对手，从而降低对手的攻击和特攻。",
        uses: ["正面吼住一片冲上来的敌人", "在开战前先把对方的输出压下去", "用宽阔的声压同时照顾到一小簇目标"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 11,
        active: 1,
        recover: 8,
        cooldown: 96,
        style: "roar",
        defaults: { form: 0 },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["nobleroar"], detail: { values: config } };
            return { radius: p("nobleroar", "reach", context), geometry: "area", style: "roar", color: 0xE8C860,
                label: config && Number(config.form) === 1 ? "低吼" : "怒吼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["nobleroar"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("nobleroar", "tempo", context)),
                recover: Math.round(p("nobleroar", "aftercast", context)),
                cooldown: Math.round(p("nobleroar", "wait", context)),
                active: 1,
                range: p("nobleroar", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_nobleroar:gather", nobleroarScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", form: Number(config && config.form) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const origin = action.origin();
            const heading = nobleroarHeading(aim(action));
            const reach = Math.max(2.5, Math.min(10, p("nobleroar", "reach", action)));
            const arc = Math.max(30, Math.min(165, Math.round(p("nobleroar", "arc", action))));
            const cow = Math.max(1, Math.min(2, Math.round(p("nobleroar", "cow", action))));
            const volume = Math.max(16, Math.round(p("nobleroar", "volume", action)));
            const falter = Math.max(40, Math.round(p("nobleroar", "falter", action)));
            const path = nobleroarCone(origin, heading, reach, arc);
            const region = WorldGeometry.sector(origin, heading, reach, arc, { below: 2, above: 3 });
            let hits = 0;
            WorldGeometry.selectEnemies(world, region, function (target, facts) {
                NativeEffects.boost(world, target, "atk", -cow);
                NativeEffects.boost(world, target, "spa", -cow);
                MobEffects.apply(world, target, nobleroarCowed, falter, 0);
                hits++;
                WorldFeedback.emit(world, nobleroarScene, 1, facts.position(),
                    { moment: "cowed", target: String(target.ref()), cow: cow, intensity: Math.min(2, cow) }, 26);
            });
            WorldFeedback.emit(world, nobleroarScene, 1, origin,
                { moment: "roar", path: path, reach: reach, arc: arc, halfArc: arc / 2, volume: volume,
                    scale: reach / 5, cow: cow, hits: hits,
                    direction: [heading.x(), heading.y(), heading.z()] }, 30);
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, nobleroarScene, 1, body.position(),
                    { moment: "settle", actor: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)),
                    hits > 0 ? nobleroarHitText : nobleroarMissText, hits > 0 ? [hits] : [], 30);
            }
            world.sound(hits > 0 ? "minecraft:entity.ravager.roar" : "minecraft:entity.ravager.ambient", origin, 20, "{}");
            done(action);
        }
    });
}
