/**
 * 放电 / discharge 的出手方式。
 *
 * 核心念头：把电从身上同时迸开——它不挑方向、不挑高低，空中地上一起打；每一次真正的命中都牵出一条
 * 从施法者连到该目标的电弧，谁被电了看得见。过载式把这一发收窄加重，去掉余电。
 *
 * 三幕：
 *   起（windup，提交前）：身上攒起细碎火花、电弧的预告。
 *   击（flash → hit → echo）：提交后电弧从身上同时迸出，圈内敌人（含空中的）各挨一记，掷一次麻痹；
 *       广域式在 `echoDelay` 刻后再扫一次余电，重新检查谁还在圈里且视线未被挡住，还命中的再挨一记。
 *   散（crackle）：有实际命中时电弧在圈内噼啪残留一阵，只作画面提示；空放只留自身短火花。
 *
 * 配置 `overcharge`（过载式）由 resolve 改时序、由公式改半径与威力：开启＝窄而重、无余电。
 */
namespace PokemonSkills {
    const dischargeScene = "world_combat:move_discharge";
    const dischargeHitText = "world_combat.move.discharge.text.hit";
    const dischargeMissText = "world_combat.move.discharge.text.miss";

    /** 一条从施法者连到目标的折线弧：首尾跟随施法者与目标，中间两段带侧向抖动，画出真实的电弧走向。 */
    function dischargeArc(centre: CombatPoint, to: CombatPoint, targetRef: string, seed: number, bend: number): any[] {
        var path: any[] = ["source"];
        var delta = to.minus(centre);
        var side = WorldCombat.point(-delta.z(), 0, delta.x());
        side = side.length() > 0.001 ? side.unit() : WorldCombat.point(1, 0, 0);
        var segments = 3;
        for (var i = 1; i < segments; i++) {
            var t = i / segments;
            var wobble = (((seed * (i * 7 + 3)) % 13) / 13 - 0.5) * bend;
            var lift = (((seed * (i * 5 + 1)) % 11) / 11 - 0.5) * bend * 0.6;
            var point = centre.plus(delta.scale(t)).plus(side.scale(wobble)).plus(WorldCombat.point(0, lift, 0));
            path.push([point.x(), point.y(), point.z()]);
        }
        path.push(targetRef);
        return path;
    }

    define({
        id: "discharge",
        name: "Discharge",
        description: "让电从身上同时迸开：身周一圈的敌人（空中地上都算）一起挨电，每次命中都牵出一条从自己到目标的电弧，被电到的可能麻痹；广域式过一会儿还会重新检查圈内、再扫一次余电。过载式收窄加重、去除余电。",
        uses: ["被围住时一次电到一圈", "连空中一起打的无差别扫场", "让贴身的几个人麻痹", "用余电逼圈里的人走开"],
        kind: "self",
        range: 3.6,
        maxRange: 5.8,
        prepare: 8,
        active: 16,
        recover: 8,
        cooldown: 30,
        style: "sparkburst",
        defaults: { overcharge: false, ai: { maxChase: 8, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("discharge", "fieldRadius", pokemon), geometry: "area", style: "sparkburst",
                color: 0xFFE96A, label: config && config.overcharge === true ? "过载放电" : "广域放电" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["discharge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var overcharge = !!(config && config.overcharge);
            return {
                prepare: p("discharge", "prepare", context) + (overcharge ? 2 : 0),
                recover: p("discharge", "recover", context),
                cooldown: p("discharge", "cooldown", context) + (overcharge ? 8 : 0),
                active: skills["discharge"].active,
                range: p("discharge", "fieldRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("discharge:charge", dischargeScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", overcharge: config && config.overcharge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.4, p("discharge", "fieldRadius", action));
            const power = p("discharge", "surge", action);
            const chance = p("discharge", "numbChance", action);
            const arcs = Math.max(2, Math.min(8, Math.round(p("discharge", "arcs", action))));
            const cap = Math.max(1, Math.round(p("discharge", "maxTargets", action)));
            const overcharge = !!(config && config.overcharge);
            const echoPower = p("discharge", "echo", action);
            const echoDelay = Math.max(4, Math.round(p("discharge", "echoDelay", action)));
            const crackle = Math.max(10, Math.round(p("discharge", "crackleTicks", action)));
            const scale = radius / 3.6;
            const bend = Math.max(0.2, 0.45 * scale);
            let total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (total > 0)
                    WorldFeedback.keep(scope, "discharge:crackle:" + String(current.actor().ref()), dischargeScene, 1, centre,
                        { moment: "crackle", radius: radius, arcs: Math.max(2, Math.round(arcs * 0.5)) }, crackle);
                else
                    WorldFeedback.emit(scope, dischargeScene, 1, centre, { moment: "miss", radius: radius, scale: scale }, 18);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    total > 0 ? dischargeHitText : dischargeMissText, total > 0 ? [total] : [], 26);
                done(current);
            }

            /** 一次放电：圈内敌人各命中一次，每次命中牵出一条从自己到该目标的电弧；`recheck` 时再查视线遮挡。 */
            function strike(current: CombatAction, amount: number, segment: string, moment: string, limit: number, recheck: boolean): number {
                const scope = current.world();
                let hits = 0, seed = scope.tick();
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hits >= limit) return;
                    if (recheck && !scope.clear(centre, facts.position())) return;
                    if (!hurt(current, enemy, "discharge", amount,
                        { damage: damageSpec("discharge", segment), status: "paralysis", chance: chance })) return;
                    hits++; total++;
                    WorldFeedback.emit(scope, dischargeScene, 1, facts.position(),
                        { moment: moment, target: ref, path: dischargeArc(centre, facts.position(), ref, seed++, bend),
                          arcs: arcs, scale: scale, intensity: Math.max(0.5, Math.min(2, amount / 70)), count: Math.round(8 + amount * 0.2) }, 22);
                });
                return hits;
            }

            sound(action, "cobblemon:move.thunderbolt.actor");
            WorldFeedback.emit(world, dischargeScene, 1, centre,
                { moment: "flash", radius: radius, arcs: arcs, scale: scale, intensity: Math.max(0.5, Math.min(2.2, power / 70)), flow: Math.round(60 + radius * 30) }, 24);
            sound(action, "cobblemon:impact.electric");
            strike(action, power, "surge", "hit", cap, false);
            if (overcharge || echoPower <= 0) { finish(action); return; }
            action.after(echoDelay, function (next: CombatAction) {
                WorldFeedback.emit(next.world(), dischargeScene, 1, centre,
                    { moment: "echo", radius: radius, arcs: Math.max(2, Math.round(arcs * 0.6)), scale: scale, flow: Math.round(40 + radius * 22) }, 22);
                sound(next, "cobblemon:impact.electric");
                strike(next, echoPower, "echo", "echo", cap, true);
                finish(next);
            });
        }
    });
}
