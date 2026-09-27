/**
 * 污泥波 / sludgewave 的出手方式。
 *
 * 核心念头：把厚污泥自身体一次向周围泼开，形成一圈近身的三维短泥幕——它不铺地、不前进，只在近处一次淋到，
 * 污泥随即滑落；被淋到的人挨一记、被推一把，有些会中毒。飞得低的敌人也在泼溅高度内，高处的不会被追踪。
 *
 * 两幕：
 *   起（windup，提交前）：脚边鼓起泥泡、咕嘟作响的预告。
 *   击（splash → hit）：提交后污泥同时向四周泼出，`curtainHeight` 覆盖身周的低空；
 *       溅到的敌人各挨一记、被向后推开、掷一次中毒；泥点粘在接触处片刻后滑落，没有持续危险场。
 *
 * 配置 `surge`（广泼式）由公式改半径、威力与推力：开启＝更广更推得动、单次更轻；关闭＝一发更厚更重。
 */
namespace PokemonSkills {
    const sludgewaveScene = "world_combat:move_sludgewave";
    const sludgewaveHitText = "world_combat.move.sludgewave.text.hit";
    const sludgewavePoisonText = "world_combat.move.sludgewave.text.poison";
    const sludgewaveMissText = "world_combat.move.sludgewave.text.miss";

    define({
        id: "sludgewave",
        name: "Sludge Wave",
        description: "把厚污泥自身体一次向周围泼开：近身一圈的敌人一起挨伤、被向后推开、可能中毒。泥幕有实际高度，贴地低飞的敌人也会被溅到，高处的不会被追踪；泼过即散，地上不会留下危险场。广泼式更广更推得动，厚泥式一发更厚更重。",
        uses: ["被围住时一次泡到近身一圈", "把冲上来的人往后挤", "让贴身的几个人中毒", "把贴地低飞的敌人一起溅到"],
        kind: "self",
        range: 3.4,
        maxRange: 6.2,
        prepare: 12,
        active: 14,
        recover: 10,
        cooldown: 40,
        style: "sludge",
        defaults: { surge: false, ai: { maxChase: 8, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sludgewave", "waveRadius", pokemon), geometry: "area", style: "sludge",
                color: 0x8FBF4A, label: config && config.surge === true ? "广泼污泥" : "厚泥拍击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["sludgewave"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var surge = !!(config && config.surge);
            return {
                prepare: p("sludgewave", "prepare", context) + (surge ? 1 : 0),
                recover: p("sludgewave", "recover", context),
                cooldown: p("sludgewave", "cooldown", context) + (surge ? 8 : -2),
                active: skills["sludgewave"].active,
                range: p("sludgewave", "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sludgewave:gurgle", sludgewaveScene, 1, action.origin(),
                JSON.stringify({ moment: "gurgle", prepare: prepare, surge: config && config.surge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            // 泥幕从真实脚面起、升到身体中心以上 height；判定高度带与可见泥幕共用这组原点与跨度。
            const half = body !== null ? body.height() / 2 : 0.7;
            const drop = body !== null ? body.boundsMin().y() - centre.y() : -half;
            const height = Math.max(0.8, p("sludgewave", "curtainHeight", action));
            const span = Math.max(0.5, -drop + height);
            const radius = Math.max(2.2, p("sludgewave", "waveRadius", action));
            const power = p("sludgewave", "sludge", action);
            const chance = p("sludgewave", "toxinChance", action);
            const push = p("sludgewave", "push", action);
            const cap = Math.max(1, Math.round(p("sludgewave", "maxTargets", action)));
            const scale = radius / 3.4;
            let total = 0;

            sound(action, "cobblemon:move.sludgebomb.actor");
            sound(action, "minecraft:entity.slime.squish");
            WorldFeedback.emit(world, sludgewaveScene, 1, centre,
                { moment: "splash", radius: radius, height: height, drop: drop, span: span, scale: scale,
                    flow: Math.round(48 + radius * 26), marks: Math.round(14 + power * 0.18), intensity: Math.max(0.5, Math.min(2.2, power / 75)) }, 24);

            // 一次选敌：泼到的人各结算一记。飞得低的人落在这片泥幕高度带内，高处的够不到，墙后的被挡。
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(WorldCombat.point(centre.x(), centre.y() + drop, centre.z()), 0, radius, { below: 0.5, above: span }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref()) || total >= cap) return;
                if (!world.clear(centre, facts.position())) return;
                const alreadyPoisoned = CombatStatus.has(world, enemy, "poison") || CombatStatus.has(world, enemy, "toxic");
                if (!hurt(action, enemy, "sludgewave", power,
                    { damage: damageSpec("sludgewave", "sludge"), status: "poison", chance: chance })) return;
                total++;
                WorldFeedback.emit(world, sludgewaveScene, 1, facts.position(),
                    { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2, power / 75)), count: Math.round(10 + power * 0.22) }, 22);
                if (!alreadyPoisoned && CombatStatus.has(world, enemy, "poison"))
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), sludgewavePoisonText, [], 26);
                if (world.valid(enemy)) {
                    // 水平分量接近零时只省水平推，避免对纯上/下受体做 unit() 抛错。
                    const side = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                    if (side.length() > 0.2) world.hitDisplace(enemy, side.unit().scale(push));
                }
            });

            if (total === 0)
                WorldFeedback.emit(world, sludgewaveScene, 1, centre, { moment: "miss", scale: scale, radius: radius }, 20);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.1, 0)),
                total > 0 ? sludgewaveHitText : sludgewaveMissText, total > 0 ? [total] : [], 26);
            done(action);
        }
    });
}
