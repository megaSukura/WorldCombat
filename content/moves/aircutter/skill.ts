/**
 * 空气利刃 / aircutter —— 注册与动作。
 *
 * 核心念头：把面前的空气一次拉成一片极薄的细刃，整片同时横扫出去——它不是一记远投，而是就地张开
 *   覆盖整个扇区；站在扇里的对手各被切一次。它有一幕：张开即切。
 *
 * 幕：
 *   起（windup，提交前）：口边/身前的空气被拉成几道将成未成的细缝，只播预告，可被打断。
 *   扇（execute → cut/miss）：提交后整片细刃从身前向扇区铺开并扫过；扇区（WorldGeometry.sector）内
 *       每个非友方各结算一次 `blade` 特殊伤害，最多切 `maxTargets` 个；没人被切到只留一道空风。
 *       这一招没有飞行过程——扇面出现的那一刻就是命中的那一刻。
 *
 * 高暴击沿用原生 critRatio 2 的共享结算；暴击命中时由本单元监听器在命中点补一记更亮的白色强调。
 */
namespace PokemonSkills {
    define({
        id: aircutterId,
        cooldownParameter: "recharge",
        name: "Air Cutter",
        description: "一次张开一片细风刃，横扫面前的扇区、同时切中多个对手；起手短、冷却低，容易击中要害。聚刃式更窄更重，广扇式更宽更密。",
        uses: ["一次张开扫过面前一整片对手", "同时切伤挤在扇面里的多个目标", "瞬发轻快，起手窗口里逼对手走位"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 5,
        active: 0,
        recover: 5,
        cooldown: 18,
        style: "air",
        defaults: { focus: false, ai: { maxChase: 10, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(aircutterId, "reach", pokemon), geometry: "cone", style: "air", color: 0xDCE9F0,
                label: config && config.focus === true ? "聚刃空气利刃" : "空气利刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[aircutterId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(aircutterId, "tempo", context)),
                recover: Math.round(p(aircutterId, "aftercast", context)),
                cooldown: Math.round(p(aircutterId, "recharge", context)),
                active: 0,
                range: p(aircutterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("aircutter:gather", aircutterScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", focus: config && config.focus === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const power = p(aircutterId, "blade", action);
            const reach = p(aircutterId, "reach", action);
            const span = p(aircutterId, "span", action);
            const thickness = p(aircutterId, "thickness", action);
            const edges = Math.max(3, Math.round(p(aircutterId, "edges", action)));
            const shards = Math.max(12, Math.round(p(aircutterId, "shards", action)));
            const cap = Math.max(1, Math.round(p(aircutterId, "maxTargets", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const scale = Math.max(0.6, Math.min(2.0, reach / aircutterReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 60));
            const heading = [direction.x(), direction.y(), direction.z()];
            let hits = 0;

            sound(action, "cobblemon:move.gust.actor");
            WorldFeedback.emit(world, aircutterScene, 1, origin,
                { moment: "sweep", direction: heading, reach: reach, span: span, thickness: thickness, edges: edges,
                    shards: shards, scale: scale, intensity: intensity }, 24);

            WorldGeometry.selectEnemies(world,
                WorldGeometry.sector(origin, direction, reach, span, { below: 1.6, above: 3.0 }),
                function (target, facts) {
                    if (hits >= cap) return;
                    if (!hurt(action, target, aircutterId, power,
                        { damage: damageSpec(aircutterId, "blade"), slice: true })) return;
                    hits++;
                    WorldFeedback.emit(world, aircutterScene, 1, facts.position(),
                        { moment: "cut", target: String(target.ref()), shards: shards, scale: scale,
                            intensity: intensity, hits: hits }, 22);
                });

            if (hits === 0) {
                WorldFeedback.emit(world, aircutterScene, 1, origin, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.05, 0)), aircutterMissText, [], 20);
            } else {
                const mark = origin.plus(WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(reach * 0.55));
                WorldFeedback.text(world, mark.plus(WorldCombat.point(0, 1.0, 0)), aircutterHitText, [hits], 24);
            }
            sound(action, "minecraft:entity.player.attack.sweep");
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的白色风屑与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_aircutter/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== aircutterId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 10;
        WorldFeedback.emit(world, aircutterScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: Math.max(10, Math.min(40, Math.round(ratio * 3))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 22);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), aircutterCritText, [], 26);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
