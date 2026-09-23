/**
 * 青草滑梯 / grassyglide 的出手方式。
 *
 * 核心念头：贴地滑出去，用身体把对手铲翻——脚下有一片青草时，草会把人托起来，起手直接归零、
 *   滑得更远更快。滑过处翻起草叶，落点还长出一小片会站人的青草（下一次滑梯的垫脚）。
 *
 * 两幕：
 *   起（windup，提交前）：脚边青草收拢、身体压低，只播预告（present gather）；脚下有草时另播一记托举。
 *   滑（execute）：提交后沿瞄准方向逐刻滑行，身后拖一条草浪；撞上第一个非友方活体就结算 slide 接触伤害、
 *       把它沿滑行方向铲开，并在落点压出一片青草（场地规则 world_combat:field/grassyglide，借共享身份 grassyterrain）；
 *       一路滑到尽头没撞上就收势落空（whiff）。
 *
 * 场地规则：落点的草每 5 刻扫一次半径内的贴地活体，给他们补 world_combat:grassyglide_ground
 *   （身份 world_combat:status/grassyterrain，identity_only）；到期自己的草枯回去。
 *   站在上面的活体因此算「在青草场地上」——草属性招式更猛，下一次青草滑梯瞬发。
 *
 * 与同族分开：电光一闪不留东西，水流喷射只浇透；青草滑梯的读法是草浪与一片真的会站人的草。
 */
namespace PokemonSkills {
    function grassyglidePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 给贴地成员补上草地身份（借共享身份 grassyterrain），非贴地的不算。 */
    function grassyglideRoot(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return;
        MobEffects.apply(world, actor, grassyglideGround, Math.max(30, Math.round(Number(field.data.mark) || 40)), 0);
    }

    /** 把落点那一片地种成青草：租借一片场地，到期草枯回去。 */
    function grassyglidePlant(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, tufts: number): void {
        try {
            WorldEffects.field(world, grassyglideField, point, Math.max(0.6, radius),
                { mark: Math.max(30, Math.round(ticks * 0.4)), radius: radius, tufts: tufts }, Math.max(40, Math.round(ticks)));
        } catch (error) { return; }
    }

    WorldEffects.fieldRule(grassyglideField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            grassyglideRoot(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = grassyglidePoint(field);
            WorldFeedback.keep(world, "grassyglide:field:" + effect.id(), grassyglideScene, 1, centre,
                { moment: "patch", radius: field.radius, tufts: field.data.tufts || 20, scale: field.radius / 1.4 }, 20);
        }
    });

    define({
        freeMovement: true,
        id: grassyglideId,
        cooldownParameter: "recharge",
        name: "Grassy Glide",
        description: "贴地滑出去用身体铲对手：撞实造成接触伤害并把目标铲开，落点压出一小片青草。脚下有青草场地时草把人托起来，起手归零、滑得更远更快——这就是「必定先制」。播种式把落点的草种得更大更久，但滑得更短。",
        uses: ["脚下有草时打一记瞬发的先手铲击", "贴上去滑过去，把目标铲开", "落点种出一片青草，供自己与队友借力"],
        kind: "enemy",
        range: 4.0,
        maxRange: 6.8,
        prepare: 3,
        active: 0,
        recover: 6,
        cooldown: 20,
        style: "grass",
        defaults: { seed: false, ai: { maxChase: 7, finish: true, onGrass: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(grassyglideId, "dash", pokemon) : 4.0) + 0.4, geometry: "line", style: "grass", color: 0x7CCB5A,
                label: config && config.seed === true ? "青草滑梯·播种" : "青草滑梯" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[grassyglideId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(grassyglideId, "tempo", context)),
                recover: Math.round(p(grassyglideId, "settle", context)),
                cooldown: Math.round(p(grassyglideId, "recharge", context)),
                active: 0,
                range: p(grassyglideId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const onGrass = CombatStatus.has(action.sense(), action.actor(), "grassyterrain");
            const tufts = Math.max(12, Math.round(p(grassyglideId, "tufts", action)));
            action.present("grassyglide:gather", grassyglideScene, 1, action.origin(),
                JSON.stringify({ moment: onGrass ? "boost" : "gather", windup: prepare, onGrass: onGrass ? 1 : 0,
                    tufts: tufts, seed: config && config.seed === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(grassyglideScene);
            const world = action.world();
            const direction = aim(action);
            const length = p(grassyglideId, "dash", action);
            const step = p(grassyglideId, "pace", action);
            const radius = p(grassyglideId, "collisionRadius", action);
            const power = p(grassyglideId, "slide", action);
            const push = p(grassyglideId, "push", action);
            const tufts = Math.max(12, Math.round(p(grassyglideId, "tufts", action)));
            const seedRadius = p(grassyglideId, "seedRadius", action);
            const seedTicks = Math.max(80, Math.round(p(grassyglideId, "seedTicks", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            let travelled = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");
            movementScenes.show(action, "slide", action.origin(), { moment: "slide", scale: scale, tufts: tufts, intensity: intensity });

            function finish(current: CombatAction, at: CombatPoint, moment: string): void {
                const scope = current.world();
                if (moment === "whiff") {
                    WorldFeedback.emit(scope, grassyglideScene, 1, at, { moment: "whiff", scale: scale, tufts: tufts }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.05, 0)), grassyglideMissText, [], 22);
                    scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                }
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, grassyglideId, power,
                            { damage: damageSpec(grassyglideId, "slide"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(origin);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                            // 草皮种在被打倒的落脚处：撞到哪里，哪里就长草，站上去的人自然算在青草场地上。
                            const planted = scope.observe(victim);
                            const plantAt = planted === null ? hit.position() : planted.position();
                            grassyglidePlant(scope, plantAt, seedRadius, seedTicks, tufts);
                            scope.sound("cobblemon:impact.grass", plantAt, 16, "{}");
                            scope.sound("minecraft:block.grass.break", plantAt, 12, "{}");
                            WorldFeedback.emit(scope, grassyglideScene, 1, plantAt,
                                { moment: "hit", target: String(victim.ref()), tufts: tufts, scale: scale, intensity: intensity }, 24);
                            WorldFeedback.emit(scope, grassyglideScene, 1, plantAt,
                                { moment: "plant", radius: seedRadius, tufts: tufts, scale: seedRadius / 1.4 }, 26);
                            WorldFeedback.text(scope, plantAt.plus(WorldCombat.point(0, 1.15, 0)), grassyglidePlantText, [], 24);
                        }
                        finish(current, hit.position(), "hit");
                    } else {
                        finish(current, current.origin(), "whiff");
                    }
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p(grassyglideId, "minimumMove", current) || travelled >= length) {
                    finish(current, current.origin(), "whiff");
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
