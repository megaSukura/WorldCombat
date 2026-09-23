/**
 * 催眠粉 / Sleep Powder —— 出手方式。
 *
 * 核心念头：一撮抛出去、落地就不散的催眠尘云。粉团落在选定位置摊开成一片云，谁站在云里谁被一口口喂进
 *   睡意——先变慢、够数再睡下；走出去的人睡意还挂着慢慢走完。它是四式里唯一一个把一片地留在世界上的：
 *   可以封路口、把敌人赶进去，也可以等它自己散去。草属性直接穿过粉末。
 *
 * 幕：
 *   起（windup，提交前）：掌心拢粉的预告（`action.present`）。
 *   掷（throw）：提交后低弧抛出粉团，`LivingActions.projectile` 负责飞行与碰撞。
 *   落（burst → field）：粉团落地炸开，注册一片共享场地 `world_combat:move_sleeppowder_cloud`
 *       （`WorldEffects.field`）；云里的非友方被共享的 `PokemonSkills.powder` 逐口喂进睡意，够数时挂上共享的
 *       `world_combat:status/sleep`（宝可梦那一层同步成原生睡眠）；云在 `cloudTicks` 后自然散去。
 *
 * 反制：走出云外（睡意挂着慢慢散）、绕开落点、等云散去；草属性穿过粉末。云以施法者为源，被收回或远离则随之结束。
 */
namespace PokemonSkills {
    /** 草属性对粉末免疫：它直接穿过这团云。 */
    function sleeppowderGrassImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "grass") return true;
        return false;
    }

    // 催眠尘云的行为：站在云里的非友方被逐口喂进睡意，够数睡下；走出云外按残余睡意走完。
    WorldEffects.fieldRule(sleeppowderField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const data = field.data || {};
            const ref = String(actor.ref());
            if (sleeppowderGrassImmune(world, actor)) {
                const warned = data.grass || (data.grass = {});
                if (!warned[ref]) {
                    warned[ref] = true;
                    const body = world.observe(actor);
                    if (body !== null) {
                        WorldFeedback.emit(world, sleeppowderScene, 1, body.position(), { moment: "immune", target: ref }, 20);
                        WorldFeedback.text(world, body.position(), "world_combat.move.sleeppowder.text.grass", [], 24);
                    }
                }
                return;
            }
            const exposure = data.exposure || (data.exposure = {});
            const before = exposure[ref] || 0;
            powder(world, actor, field, {
                sleep: true,
                interval: Math.max(6, Math.round(data.doseInterval || 18)),
                duration: Math.max(40, Math.round(data.sleepTicks || 240)),
                drowsyDuration: Math.max(20, Math.round(data.drowsyTicks || 60)),
                drowsiness: function (dose: number): number { return Math.max(0, Math.min(4, dose - 1)); }
            });
            const body = world.observe(actor);
            if (body === null) return;
            if (CombatStatus.has(world, actor, "sleep")) {
                WorldFeedback.emit(world, sleeppowderScene, 1, body.position(),
                    { moment: "sleep", target: ref, motes: data.motes || 18 }, 30);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)),
                    "world_combat.move.sleeppowder.text.sleep", [Math.round(Math.max(40, Math.round(data.sleepTicks || 240)) / 20)], 30);
                return;
            }
            const after = (data.exposure && data.exposure[ref]) || 0;
            if (after > before) {
                WorldFeedback.emit(world, sleeppowderScene, 1, body.position(),
                    { moment: "caught", target: ref, dose: after, density: data.density || 3 }, 22);
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            const scale = Math.max(0.5, Math.min(2.2, field.radius / 2.4));
            WorldFeedback.keep(world, "sleeppowder:cloud:" + effect.id(), sleeppowderScene, 1, centre,
                { moment: "field", scale: scale, motes: (field.data && field.data.motes) || 18 }, 40);
        }
    });

    define({
        id: sleeppowderId,
        cooldownParameter: "recharge",
        name: "催眠粉",
        description: "抛出催眠粉，落地摊成一片久久不散的尘云：站在云里的敌人被一口口喂进睡意，先变慢、够数便睡下；走出去的人睡意还挂着慢慢走完。它可以封住一条路或把敌人赶进去，草属性则直接穿过粉末。",
        uses: ["封住一条通道、门口或退路", "把追兵赶进云里慢慢倒", "为队友的食梦或恶梦制造睡眠区"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 95,
        style: "powder",
        defaults: { thick: false },
        fields: [
            flag("thick", "厚云")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sleeppowderId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(sleeppowderId, "tempo", context)),
                recover: Math.round(p(sleeppowderId, "aftercast", context)),
                cooldown: Math.round(p(sleeppowderId, "recharge", context)),
                active: 1,
                range: p(sleeppowderId, "throwReach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sleeppowder:windup:" + action.id(), sleeppowderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", thick: config && config.thick === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sleeppowderId], detail: { values: config } };
            return { radius: pokemon ? p(sleeppowderId, "cloudRadius", context) : 2.4, geometry: "area", style: "powder", color: 0xB08CFF,
                label: config && config.thick === true ? "催眠粉·厚云" : "催眠粉·散云" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const speed = Math.max(0.6, p(sleeppowderId, "puffSpeed", action));
            const radius = Math.max(1.4, p(sleeppowderId, "cloudRadius", action));
            const ticks = Math.max(60, Math.round(p(sleeppowderId, "cloudTicks", action)));
            const density = Math.max(2, Math.round(p(sleeppowderId, "density", action)));
            const doseInterval = Math.max(8, Math.round(p(sleeppowderId, "doseInterval", action)));
            const sleepTicks = Math.max(60, Math.round(p(sleeppowderId, "sleepTicks", action)));
            const drowsyTicks = Math.max(30, Math.round(p(sleeppowderId, "drowsyTicks", action)));
            const motes = Math.max(8, Math.round(p(sleeppowderId, "motes", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / 2.4));
            let settled = false;

            function burst(current: CombatAction, point: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldEffects.field(scope, sleeppowderField, point, radius,
                    { density: density, doseInterval: doseInterval, sleepTicks: sleepTicks, drowsyTicks: drowsyTicks, motes: motes }, ticks);
                WorldFeedback.emit(scope, sleeppowderScene, 1, point,
                    { moment: "burst", radius: radius, motes: motes, density: density, scale: scale }, 28);
                WorldFeedback.text(scope, point, "world_combat.move.sleeppowder.text.land", [], 24);
                sound(current, "minecraft:block.sand.place");
                done(current);
            }

            sound(action, "minecraft:block.sand.break");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.26, lifetime: 100,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.95, tint: 0xB08CFF },
                impact: function (current, hit) { burst(current, hit.position()); }
            }, function (current) { burst(current, current.targetPosition()); });
            WorldFeedback.emit(world, sleeppowderScene, 1, origin,
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                  scale: scale, motes: motes }, 30);
        }
    });
}
