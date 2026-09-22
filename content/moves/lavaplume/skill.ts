/**
 * 喷烟 / lavaplume 的出手方式。
 *
 * 核心念头：先从身上向上喷起一道熔岩烟柱，再让它向外塌成一道火环——竖直起势是这招与同族最不同的地方；
 * 被烧到的可能灼伤。开浓烟式时火环退去后地上还留一层闷烧的余烬，没走开的人会反复挨烫。
 *
 * 三幕：
 *   起（windup，提交前）：身上腾起火星与浓烟的预告。
 *   击（plume → wave → hit）：提交后先向上喷起烟柱，随即火环从脚下向外铺开；
 *       每一圈扫到的敌人各挨一记火环伤害，掷一次灼伤。
 *   收（ember / fade）：浓烟式留下余烬，按 `emberPulse` 反复烫圈内的人，到 `emberTicks` 散去；爆燃式一次即止。
 *
 * 配置 `fume`（浓烟式）由 resolve 改时序、由公式改威力与半径：开启＝封地，关闭＝一发更重。
 */
namespace PokemonSkills {
    const lavaplumeScene = "world_combat:move_lavaplume";
    const lavaplumeBurnText = "world_combat.move.lavaplume.text.burn";
    const lavaplumeHitText = "world_combat.move.lavaplume.text.hit";
    const lavaplumeMissText = "world_combat.move.lavaplume.text.miss";

    define({
        id: "lavaplume",
        name: "Lava Plume",
        description: "先从身上向上喷起一道熔岩烟柱，再向外塌成一道火环：圈内敌人一起挨烧、可能灼伤。浓烟式退去后地上留下闷烧的余烬，反复烫没走开的人；爆燃式一发更重、没有余烬。",
        uses: ["被围住时一次烧到一圈", "让贴身的几个人灼伤", "用余烬封住一片地", "打断贴身的攻击节奏"],
        kind: "self",
        range: 3.2,
        maxRange: 5.6,
        prepare: 12,
        active: 20,
        recover: 10,
        cooldown: 36,
        style: "inferno",
        defaults: { fume: false, ai: { maxChase: 8, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("lavaplume", "ringRadius", pokemon), geometry: "area", style: "inferno",
                color: 0xFF7A2E, label: config && config.fume === true ? "浓烟喷烟" : "爆燃喷烟" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["lavaplume"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            var fume = !!(config && config.fume);
            return {
                prepare: p("lavaplume", "prepare", context) + (fume ? 2 : 0),
                recover: p("lavaplume", "recover", context),
                cooldown: p("lavaplume", "cooldown", context) + (fume ? 10 : -2),
                active: skills["lavaplume"].active,
                range: p("lavaplume", "ringRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("lavaplume:stoke", lavaplumeScene, 1, action.origin(),
                JSON.stringify({ moment: "stoke", fume: config && config.fume === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.2, p("lavaplume", "ringRadius", action));
            const power = p("lavaplume", "plume", action);
            const chance = p("lavaplume", "burnChance", action);
            const spread = Math.max(4, Math.round(p("lavaplume", "spreadTicks", action)));
            const height = p("lavaplume", "plumeHeight", action);
            const emberPower = p("lavaplume", "ember", action);
            const emberTicks = Math.max(30, Math.round(p("lavaplume", "emberTicks", action)));
            const emberPulse = Math.max(4, Math.round(p("lavaplume", "emberPulse", action)));
            const cap = Math.max(1, Math.round(p("lavaplume", "maxTargets", action)));
            const fume = !!(config && config.fume);
            const scale = radius / 3.2;
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, elapsed = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, lavaplumeScene, 1, centre, { moment: "fade", radius: radius, scale: scale }, 28);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    total > 0 ? lavaplumeHitText : lavaplumeMissText, total > 0 ? [total] : [], 26);
                done(current);
            }

            /** 火环扫过一圈：每圈命中的敌人各挨一次火环伤害并掷灼伤。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / spread, inner = Math.max(0, radius * step / spread - 0.3);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hitRefs[ref] || total >= cap) return;
                    hitRefs[ref] = true;
                    const alreadyBurned = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "lavaplume", power,
                        { damage: damageSpec("lavaplume", "plume"), status: "burn", chance: chance })) return;
                    total++;
                    WorldFeedback.emit(scope, lavaplumeScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2, power / 70)), count: Math.round(10 + power * 0.25) }, 22);
                    if (!alreadyBurned && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), lavaplumeBurnText, [], 26);
                });
                WorldFeedback.keep(scope, "lavaplume:wave:" + String(current.actor().ref()), lavaplumeScene, 1, centre,
                    { moment: "wave", radius: outer, flow: Math.round(50 + outer * 30), progress: (step + 1) / spread }, 10);
                step++;
                if (step >= spread) { after(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            /** 浓烟式：火环退去后余烬继续闷烧；爆燃式直接收尾。 */
            function after(current: CombatAction): void {
                if (!fume) { finish(current); return; }
                pulse(current);
            }

            function pulse(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.keep(scope, "lavaplume:ember:" + String(current.actor().ref()), lavaplumeScene, 1, centre,
                    { moment: "ember", radius: radius, flow: Math.round(30 + radius * 14) }, emberPulse + 6);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 2, above: 2 }), function (enemy, facts) {
                    if (String(enemy.ref()) === String(current.actor().ref())) return;
                    if (!hurt(current, enemy, "lavaplume", emberPower, { damage: damageSpec("lavaplume", "ember") })) return;
                    hits++; total++;
                    WorldFeedback.emit(scope, lavaplumeScene, 1, facts.position(),
                        { moment: "ember", target: String(enemy.ref()), scale: scale, count: Math.round(6 + emberPower) }, 18);
                });
                elapsed += emberPulse;
                if (elapsed >= emberTicks) { finish(current); return; }
                current.after(emberPulse, function (next: CombatAction) { pulse(next); });
            }

            sound(action, "cobblemon:move.lavaplume.actor");
            WorldFeedback.emit(world, lavaplumeScene, 1, centre,
                { moment: "plume", height: height, radius: radius, scale: scale, flow: Math.round(40 + height * 24), intensity: Math.max(0.5, Math.min(2.2, power / 70)) }, 26);
            sound(action, "minecraft:block.lava.pop");
            action.after(3, function (next: CombatAction) { advance(next); });
        }
    });
}
