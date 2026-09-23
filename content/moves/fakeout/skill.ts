/**
 * 击掌奇袭 / fakeout 的出手方式。
 *
 * 核心念头：被放上场的那一瞬间，趁着对手还没反应过来，闪身上去一记掌掴把它的脸拍偏——它这一手就作废了。
 *   这是全组最短、最快、最赌「开场」的一招：一旦自己已经出过任何一手，这个时机就永远过去了。
 *
 * 两幕：
 *   起（windup，提交前）：压低身子、掌心蓄起暖光；不是刚出场就只作空起势（present ready / whiff）。
 *   拍（execute）：提交后闪身贴上，撞上活体的一刻结算 swat 接触伤害、把人顶开，并按共享身份
 *       `world_combat:status/flinch` 拍懵它、投递 world_combat:interrupt 把它此刻那一手按停。
 *       拍空就只是一记挥空（PP 照扣，因为提交前 ready 已确认过「刚出场」，落空只是位置没对上）。
 *
 * 与同族分开：
 *   快手还击只认「对手正在出先制招」并把那一手按停，不看自己是否刚出场、伤害更低；
 *   迎头一击同样是「刚出场」，但那是一记重砸、没有懵；击掌奇袭是两者里唯一的开场打断。
 */

namespace PokemonSkills {
    const fakeoutHitText = "world_combat.move.fakeout.text.hit";
    const fakeoutDazeText = "world_combat.move.fakeout.text.daze";
    const fakeoutMissText = "world_combat.move.fakeout.text.miss";

    /** 拍懵：挂共享畏缩身份并把它正在执行的一手按停。 */
    function fakeoutDaze(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, fakeoutDazeEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: fakeoutId,
        cooldownParameter: "recharge",
        name: "Fake Out",
        description: "A quick opening slap that strikes first and leaves the target flinched; it only works right after the user enters battle.",
        uses: ["刚上场就抢一记把对手拍懵", "打断对手正在展开的起手", "开场先手把对手顶开一步"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.8,
        prepare: 2,
        active: 0,
        recover: 6,
        cooldown: 34,
        style: "contact",
        defaults: { feint: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(fakeoutId, "collisionRadius", pokemon) * 1.6, geometry: "line", style: "contact", color: 0xF6D36B,
                label: config && config.feint === true ? "击掌奇袭·佯攻" : "击掌奇袭" };
        },
        ready: function (action) {
            return fakeoutFresh(action.sense(), action.actor()) ? "" : "skill-unavailable";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[fakeoutId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(fakeoutId, "tempo", context)),
                recover: Math.round(p(fakeoutId, "settle", context)),
                cooldown: Math.round(p(fakeoutId, "recharge", context)),
                active: 0,
                range: p(fakeoutId, "blink", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const fresh = fakeoutFresh(action.sense(), action.actor());
            action.present("fakeout:ready", fakeoutScene, 1, action.origin(),
                JSON.stringify({ moment: fresh ? "ready" : "whiff", feint: config && config.feint === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(fakeoutId, "blink", action);
            const step = p(fakeoutId, "speed", action);
            const radius = p(fakeoutId, "collisionRadius", action);
            const power = p(fakeoutId, "swat", action);
            const push = p(fakeoutId, "push", action);
            const dazeTicks = Math.round(p(fakeoutId, "dazeTicks", action));
            const scale = radius / 0.4;
            const count = Math.round(18 + power * 0.5);
            let travelled = 0;

            sound(action, "minecraft:entity.player.attack.weak");

            function miss(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, fakeoutScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), fakeoutMissText, [], 20);
                scope.sound("minecraft:entity.player.attack.nodamage", at, 12, "{}");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(fakeoutId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, fakeoutId, power,
                            { damage: damageSpec(fakeoutId, "swat"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                            if (fakeoutDaze(scope, victim, dazeTicks)) {
                                WorldFeedback.emit(scope, fakeoutScene, 1, hit.position(),
                                    { moment: "daze", target: String(victim.ref()), daze: dazeTicks,
                                        stars: Math.round(5 + dazeTicks / 6) }, 30);
                                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.35, 0)), fakeoutDazeText, [], 28);
                            }
                        }
                        WorldFeedback.emit(scope, fakeoutScene, 1, hit.position(),
                            { moment: "clap", target: String(victim.ref()), count: count, scale: scale,
                                power: Math.round(power * 10) / 10 }, 26);
                        scope.sound("minecraft:block.amethyst_block.hit", hit.position(), 14, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.05, 0)), fakeoutHitText,
                            [Math.round(power)], 24);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(fakeoutId, "minimumMove", current) || travelled >= length) {
                    miss(current, here.plus(delta));
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

}
