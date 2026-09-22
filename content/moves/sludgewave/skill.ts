/**
 * 污泥波 / sludgewave 的出手方式。
 *
 * 核心念头：从脚下涌起一道黏稠的污泥潮，慢慢向外漫开——它比同族走得慢、推得动，把路上的人往后挤；
 * 有些会中毒。潮退之后，地上留下一滩滩污泥，把这块地方弄脏一会儿。
 *
 * 三幕：
 *   起（windup，提交前）：脚边鼓起泥泡、咕嘟作响的预告。
 *   击（surge → hit）：提交后污泥潮从脚下向外漫开，漫到的敌人各挨一记、被向后推开、掷一次中毒。
 *   退（recede → puddle）：潮退时在原地留下污泥洼，停留一会儿后原方块回来。
 *
 * 配置 `surge`（涌浪式）由 resolve 改时序、由公式改半径与威力：开启＝慢而远、推得动；关闭＝一发更厚的拍击。
 */
namespace PokemonSkills {
    const sludgewaveScene = "world_combat:move_sludgewave";
    const sludgewaveHitText = "world_combat.move.sludgewave.text.hit";
    const sludgewavePoisonText = "world_combat.move.sludgewave.text.poison";
    const sludgewaveMissText = "world_combat.move.sludgewave.text.miss";

    /** 潮退后在地表留下污泥洼；只动地表的可换方块，到期原方块回来。 */
    function sludgewavePuddle(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        var cells: any[] = [], baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        var limit = Math.max(8, Math.round(cap)), r = Math.ceil(radius), inner = Math.max(0.4, radius * 0.2);
        for (var dx = -r; dx <= r && cells.length < limit; dx++) for (var dz = -r; dz <= r && cells.length < limit; dz++) {
            var distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius || distance < inner) continue;
            var x = baseX + dx, z = baseZ + dz;
            for (var dy = 1; dy >= -2; dy--) {
                var y = baseY + dy;
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id !== "minecraft:mud") cells.push({ x: x, y: y, z: z, block: "minecraft:mud" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "sludgewave",
        name: "Sludge Wave",
        description: "从脚下涌起一道黏稠的污泥潮，慢慢向外漫开：漫到的敌人一起挨伤、被向后推开、可能中毒；潮退后在地上留下一滩滩污泥。涌浪式更慢更远、推得更动，拍击式一发更厚更重。",
        uses: ["被围住时一次泡到一圈", "把冲上来的人往后挤", "让贴身的几个人中毒", "把一片地弄脏、逼人挪位"],
        kind: "self",
        range: 3.4,
        maxRange: 6.2,
        prepare: 12,
        active: 22,
        recover: 10,
        cooldown: 40,
        style: "sludge",
        defaults: { surge: false, ai: { maxChase: 8, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sludgewave", "waveRadius", pokemon), geometry: "area", style: "sludge",
                color: 0x8FBF4A, label: config && config.surge === true ? "涌浪污泥" : "拍击污泥" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["sludgewave"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var surge = !!(config && config.surge);
            return {
                prepare: p("sludgewave", "prepare", context) + (surge ? 2 : 0),
                recover: p("sludgewave", "recover", context),
                cooldown: p("sludgewave", "cooldown", context) + (surge ? 8 : -2),
                active: skills["sludgewave"].active,
                range: p("sludgewave", "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sludgewave:gurgle", sludgewaveScene, 1, action.origin(),
                JSON.stringify({ moment: "gurgle", surge: config && config.surge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.2, p("sludgewave", "waveRadius", action));
            const power = p("sludgewave", "sludge", action);
            const chance = p("sludgewave", "toxinChance", action);
            const push = p("sludgewave", "push", action);
            const steps = Math.max(2, Math.round(p("sludgewave", "surgeTicks", action)));
            const puddleTicks = Math.max(40, Math.round(p("sludgewave", "puddleTicks", action)));
            const puddles = Math.max(8, Math.round(p("sludgewave", "puddles", action)));
            const cap = Math.max(1, Math.round(p("sludgewave", "maxTargets", action)));
            const scale = radius / 3.4;
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const placed = sludgewavePuddle(scope, centre, radius, puddleTicks, puddles);
                WorldFeedback.emit(scope, sludgewaveScene, 1, centre, { moment: "recede", radius: radius, scale: scale, cells: placed, flow: Math.round(20 + placed * 1.5) }, 26);
                WorldFeedback.keep(scope, "sludgewave:puddle:" + String(current.actor().ref()), sludgewaveScene, 1, centre,
                    { moment: "puddle", radius: radius, flow: Math.round(16 + placed) }, puddleTicks);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.1, 0)),
                    total > 0 ? sludgewaveHitText : sludgewaveMissText, total > 0 ? [total] : [], 26);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / steps, inner = Math.max(0, radius * step / steps - 0.3);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hitRefs[ref] || total >= cap) return;
                    hitRefs[ref] = true;
                    const alreadyPoisoned = CombatStatus.has(scope, enemy, "poison") || CombatStatus.has(scope, enemy, "toxic");
                    if (!hurt(current, enemy, "sludgewave", power,
                        { damage: damageSpec("sludgewave", "sludge"), status: "poison", chance: chance })) return;
                    total++;
                    WorldFeedback.emit(scope, sludgewaveScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2, power / 75)), count: Math.round(10 + power * 0.22) }, 22);
                    if (!alreadyPoisoned && CombatStatus.has(scope, enemy, "poison"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), sludgewavePoisonText, [], 26);
                    const away = facts.position().minus(centre);
                    if (scope.valid(enemy) && away.length() > 0.2)
                        scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                });
                WorldFeedback.keep(scope, "sludgewave:wave:" + String(current.actor().ref()), sludgewaveScene, 1, centre,
                    { moment: "surge", radius: outer, flow: Math.round(44 + outer * 26), progress: (step + 1) / steps }, 10);
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.sludgebomb.actor");
            sound(action, "minecraft:entity.slime.squish");
            WorldFeedback.emit(world, sludgewaveScene, 1, centre,
                { moment: "surge", radius: radius, scale: scale, flow: Math.round(44 + radius * 26), intensity: Math.max(0.5, Math.min(2.2, power / 75)), bursts: 40 }, 24);
            advance(action);
        }
    });
}
