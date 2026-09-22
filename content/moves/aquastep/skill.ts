/**
 * 流水旋舞 / aquastep 的出手方式。
 *
 * 核心念头：绕着对手跳的一支水舞。每一步都踩出一圈水花，在目标身边左右点踏、把它逗得团团转，
 * 最后一拍拧身扫出一整圈水刃；命中的地方水花炸开，轻快的步子顺势把自己带得更快。踩在雨中步子更盛。
 *
 * 两幕（多拍 + 收势）：
 *   起（bow，提交前）：屈膝行礼，水花绕脚打转。
 *   舞（step × N → spin → boost）：提交后按拍位移到目标四周的落点，每拍激起一圈水花；
 *       最后一拍拧身扫出半径 reach 的一整圈，选定目标吃满、圈内其他人吃外围占比；命中提速。
 *
 * 与同族分开：起草是草绿的一跃、蓄能焰袭是直线火焰冲锋，流水旋舞是**多拍碎步绕着对手**，
 * 配置 `twirl` 决定收势落在正面还是绕到背后。
 */
namespace PokemonSkills {
    const aquastepScene = "world_combat:move_aquastep";
    const aquastepSpinText = "world_combat.move.aquastep.text.spin";
    const aquastepHasteText = "world_combat.move.aquastep.text.haste";
    const aquastepMissText = "world_combat.move.aquastep.text.miss";

    function aquastepHasteNow(current: CombatAction, stages: number): void {
        const world = current.world(), self = current.actor();
        NativeEffects.boost(world, self, "spe", stages);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, aquastepScene, 1, body.position(), { moment: "boost", stages: stages }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), aquastepHasteText, [stages], 34);
        world.sound("minecraft:block.water.ambient", body.position(), 12, "{}");
    }

    define({
        id: "aquastep",
        name: "流水旋舞",
        description: "以盈盈欲滴的轻快步伐戏耍对手并给予其伤害。会提高自己的速度。",
        uses: ["绕着对手点踏几拍再旋身收势", "在圈子正中把周围的人都扫一下", "命中后提速，趁步子还在时拉开或追击"],
        kind: "enemy",
        range: 4,
        maxRange: 6,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 46,
        style: "dance",
        defaults: { twirl: false, ai: { maxChase: 9, spacing: 3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("aquastep", "reach", pokemon), geometry: "area", style: "dance", color: 0x4FC3E8, label: "流水旋舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["aquastep"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("aquastep", "bow", context)),
                recover: Math.round(p("aquastep", "recover", context)),
                cooldown: Math.round(p("aquastep", "cooldown", context)),
                active: 0,
                range: p("aquastep", "reach", context) + 1.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_aquastep:bow", aquastepScene, 1, action.origin(),
                JSON.stringify({ moment: "bow", twirl: !!(config && config.twirl) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const steps = Math.max(2, Math.min(4, Math.round(p("aquastep", "steps", action))));
            const beat = Math.max(2, Math.round(p("aquastep", "beat", action)));
            const reach = p("aquastep", "reach", action);
            const stride = Math.min(p("aquastep", "stride", action), Math.max(0.8, reach - 0.4));
            const spin = p("aquastep", "spin", action);
            const spread = p("aquastep", "spread", action);
            const haste = Math.max(1, Math.round(p("aquastep", "haste", action)));
            const push = p("aquastep", "push", action);
            const splash = Math.round(p("aquastep", "splash", action));
            const twirl = !!(config && config.twirl);
            const scale = reach / 2.2;
            const intensity = Math.max(0.6, Math.min(2.4, spin / 90));
            const centre = action.target() !== null && world.valid(action.target()!) ? world.observe(action.target()!)!.position() : action.targetPosition();
            const start = self === null ? action.origin() : self.position();
            const flat = WorldCombat.point(start.x() - centre.x(), 0, start.z() - centre.z());
            const near = flat.length() < 1e-6 ? 0 : Math.atan2(flat.x(), flat.z());
            let index = 0, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function pointAt(bearing: number, distance: number): CombatPoint {
                return centre.plus(WorldCombat.point(Math.sin(bearing) * distance, start.y() - centre.y(), Math.cos(bearing) * distance));
            }
            function stepBearing(i: number): number {
                return twirl ? near + (i + 1) * (Math.PI / steps) : near + (i % 2 === 0 ? 0.9 : -0.9);
            }
            function finalBearing(): number { return twirl ? near + Math.PI : near; }

            function spinNow(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const from = body.position();
                const victim = action.target() !== null && scope.valid(action.target()!) ? action.target() : null;
                current.face(centre, 24, 24);
                let hits = 0, primary = false;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(from, 0, reach, { below: 2, above: 3 }), function (other: CombatActor) {
                    const isPrimary = victim !== null && String(other.ref()) === String(victim.ref());
                    const amount = isPrimary ? spin : spin * spread;
                    const landed = hurt(current, other, "aquastep", amount, { damage: damageSpec("aquastep", "spin"), contact: true });
                    if (landed) {
                        if (isPrimary) primary = true;
                        const otherBody = scope.observe(other);
                        if (otherBody !== null) scope.displace(other, otherBody.position().minus(from).unit().scale(push));
                    }
                    hits++;
                });
                WorldFeedback.emit(scope, aquastepScene, 1, from,
                    { moment: "spin", radius: reach, scale: scale, splash: splash, intensity: intensity, targets: hits, twirl: twirl }, 30);
                sound(current, "cobblemon:move.waterpulse.target");
                if (hits > 0) {
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.2, 0)), aquastepSpinText, [hits], 28);
                    if (primary) aquastepHasteNow(current, haste);
                } else {
                    WorldFeedback.text(scope, from.plus(WorldCombat.point(0, 1.2, 0)), aquastepMissText, [], 24);
                }
                finish(current);
            }

            function stepNow(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const bearing = stepBearing(index);
                const delta = pointAt(bearing, stride).minus(body.position());
                if (delta.length() > 0.05) scope.displace(actor, delta);
                current.face(centre, 24, 24);
                const here = scope.observe(actor)!.position();
                WorldFeedback.emit(scope, aquastepScene, 1, here,
                    { moment: "step", radius: reach, scale: scale, splash: splash, index: index + 1, steps: steps, twirl: twirl }, 22);
                sound(current, index === 0 ? "cobblemon:move.waterpulse.actor" : "minecraft:item.trident.riptide_1");
                index++;
                if (index >= steps) { stepBehind(current); return; }
                current.after(beat, stepNow);
            }

            /** 收势：先补一步站到正面或背后，再旋身。 */
            function stepBehind(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                if (body !== null) {
                    const delta = pointAt(finalBearing(), stride).minus(body.position());
                    if (delta.length() > 0.05) scope.displace(actor, delta);
                }
                current.after(2, spinNow);
            }
            WorldFeedback.emit(world, aquastepScene, 1, action.origin(),
                { moment: "bow", scale: scale, splash: splash, steps: steps, twirl: twirl }, 20);
            sound(action, "cobblemon:move.watersport.actor");
            stepNow(action);
        }
    });
}
