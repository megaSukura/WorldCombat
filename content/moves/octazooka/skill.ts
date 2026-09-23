/** 章鱼桶炮：连续墨弹造成伤害并降低命中；脸部墨迹与落点墨花由粒子承载。 */
namespace PokemonSkills {
    const octazookaScene = "world_combat:move_octazooka";

    /** 把瞄准方向按散布角随机偏一点：水平面内取随机方位，半径由散布角与随机数决定。 */
    function octazookaJitter(base: CombatPoint, degrees: number, world: CombatWorld): CombatPoint {
        const spread = Math.max(0, degrees) * Math.PI / 180;
        if (spread <= 0) return base.unit();
        const angle = world.random() * Math.PI * 2;
        const radius = Math.tan(Math.min(0.4, spread)) * Math.sqrt(world.random());
        const horizontal = WorldCombat.point(-base.z(), 0, base.x());
        const side = horizontal.length() < 0.01 ? WorldCombat.point(1, 0, 0) : horizontal.unit();
        return base.unit().plus(side.scale(Math.cos(angle) * radius)).plus(WorldCombat.point(0, Math.sin(angle) * radius, 0)).unit();
    }

    define({
        id: "octazooka",
        name: "Octazooka",
        description: "朝对手脸上连喷数股墨汁；每股命中都造成伤害，并有约一半机会糊住它的眼睛、削掉命中。",
        uses: ["中近距离的连续墨流", "用墨汁糊眼，削掉对手命中"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 44,
        style: "ink",
        defaults: { thick: false, ai: { maxChase: 15, leaveStation: true } },
        fields: [
            flag("thick", "浓墨")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["octazooka"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !!(config && config.thick);
            return { prepare: Math.round(p("octazooka", "tempo", context)), recover: 8,
                cooldown: 44 + (thick ? 4 : 0), active: 0, range: p("octazooka", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("octazooka:charge", octazookaScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 0.6, geometry: "area", style: "ink", color: 0x1B1B24, label: "章鱼桶炮" }; },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            const body = world.observe(actor);
            const scale = body === null ? 1 : (body.width() + body.height()) / 2.3;
            const velocity = p("octazooka", "velocity", action);
            const radius = p("octazooka", "radius", action);
            const power = p("octazooka", "jet", action);
            const shots = Math.max(2, Math.round(p("octazooka", "shots", action)));
            const blind = Math.max(1, Math.round(p("octazooka", "blind", action)));
            const chance = p("octazooka", "chance", action);
            const interval = Math.max(2, Math.round(p("octazooka", "interval", action)));
            const spread = p("octazooka", "spread", action);
            const steer = p("octazooka", "steer", action);
            const drops = Math.max(8, Math.round(p("octazooka", "drops", action)));
            const stainTicks = Math.max(40, Math.round(p("octazooka", "stainTicks", action)));
            const intensity = Math.max(0.5, Math.min(2.2, power / 20));
            let fired = 0, outstanding = 0, settled = false, blinded = false, stained = false;
            function finish(current: CombatAction): void {
                if (settled || fired < shots || outstanding > 0) return;
                settled = true;
                WorldFeedback.emit(current.world(), octazookaScene, 1, current.origin(),
                    { moment: "settle", shots: shots, drops: drops }, 24);
                done(current);
            }
            function onShot(current: CombatAction, hit: CombatImpact): void {
                const currentWorld = current.world();
                const target = hit.target();
                const point = hit.position();
                if (target !== null && currentWorld.valid(target) && !currentWorld.friendly(target)) {
                    impact(current, hit, "octazooka", power, { damage: damageSpec("octazooka", "jet") });
                    const at = currentWorld.observe(target);
                    if (at !== null) {
                        let blindedNow = false;
                        if (!blinded && currentWorld.random() < chance) {
                            blinded = true;
                            blindedNow = true;
                            NativeEffects.boost(currentWorld, target, "accuracy", -blind);
                            WorldFeedback.text(currentWorld, at.position().plus(WorldCombat.point(0, 1.1, 0)),
                                "world_combat.move.octazooka.text.blind", [blind], 30);
                        }
                        WorldFeedback.keep(currentWorld, "octazooka:face:" + String(target.ref()), octazookaScene, 1, at.position(),
                            { moment: "face", target: String(target.ref()), stage: blind, blinded: blindedNow ? 1 : 0,
                                drops: drops, intensity: intensity }, 70);
                    }
                }
                if (!stained) {
                    stained = true;
                    WorldFeedback.emit(currentWorld, octazookaScene, 1, point, { moment: "stain", drops: drops }, stainTicks);
                }
                WorldFeedback.emit(currentWorld, octazookaScene, 1, point,
                    { moment: "splash", target: target === null ? "" : String(target.ref()), drops: drops,
                        intensity: intensity, scale: scale }, 24);
                sound(current, "minecraft:entity.generic.splash");
            }
            function onComplete(current: CombatAction): void {
                outstanding--;
                finish(current);
            }
            function fire(current: CombatAction): void {
                if (settled || fired >= shots) return;
                fired++;
                outstanding++;
                const currentWorld = current.world();
                const currentBody = currentWorld.observe(current.actor());
                const from = currentBody === null ? current.origin()
                    : currentBody.position().plus(WorldCombat.point(0, currentBody.height() * 0.6, 0));
                const aimPoint = current.targetPosition();
                const raw = aimPoint.minus(from);
                const base = raw.length() < 0.01 ? current.direction() : raw.unit();
                const flight = LivingActions.projectile(current, {
                    speed: velocity, range: current.range(), radius: radius, lifetime: 160,
                    direction: octazookaJitter(base, spread, currentWorld),
                    appearance: { sprite: "cobblemon:particle/generic/goo/chemicalball", scale: Math.max(0.7, radius / 0.2), tint: 0x1B1B24,
                        homing: targetRef === "" ? undefined : { target: targetRef, turn: steer, delay: 1, range: current.range() } },
                    impact: onShot
                }, onComplete);
                WorldFeedback.emit(currentWorld, octazookaScene, 1, from,
                    { moment: "flight", projectile: flight, drops: drops, intensity: intensity, scale: scale }, 50);
                if (fired < shots) current.after(interval, fire);
            }
            sound(action, "minecraft:entity.squid.squirt");
            WorldFeedback.emit(world, octazookaScene, 1, action.origin(),
                { moment: "jet", shots: shots, drops: drops, scale: scale, intensity: intensity }, 50);
            fire(action);
        }
    });
}
