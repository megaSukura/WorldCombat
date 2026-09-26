/**
 * 章鱼桶炮 / octazooka 的出手方式。
 *
 * 核心念头：一口墨在口中聚成球，随后按节奏连喷数股墨弹；每股各自飞出、各自结算，靠连续瞄准保持压力。
 *
 * 选取：kind 为 aim——可以锁定一个实体、也可以朝一个方向或世界点空喷；提交与执行都不要求存在敌人。
 *   选中的实体才启用原有的有限转向（每股追着它修正）；没有实体时，每股沿提交的瞄准方向直线喷出。
 *   伤害许可按敌我独立判断：朝友方或空地喷不会造成伤害，首碰方块只留一小块装饰墨。
 *
 * 三幕：
 *   起：墨在口中聚成球（提交前 windup 预告）。
 *   喷：提交后按 `shots` 逐股喷出，每股各有一个炮口收缩表现与真实弹体，股间隔 `interval`。
 *   收：墨流喷尽，余墨散尽；整次施放最多成功削一次命中，成功那一下才在目标脸上罩墨。
 *
 * 与同族分开：掷泥/泥巴炸弹是一次抛掷或一次爆炸；章鱼桶炮的数股连喷与股间间隙是它的身份，不加墨池。
 */
namespace PokemonSkills {
    const octazookaScene = "world_combat:move_octazooka";

    /** 方块表面的外法线，用来把首碰方块的装饰墨贴在真实那一面。 */
    function octazookaNormal(face: string): number[] {
        if (face === "down") return [0, -1, 0];
        if (face === "north") return [0, 0, -1];
        if (face === "south") return [0, 0, 1];
        if (face === "west") return [-1, 0, 0];
        if (face === "east") return [1, 0, 0];
        return [0, 1, 0];
    }

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
        description: "朝瞄准方向或落点连喷数股墨汁；每股命中都造成伤害，并有约一半机会糊住它的眼睛、削掉命中。可以朝空地空喷，首碰方块只留装饰墨。",
        uses: ["中近距离的连续墨流", "用墨汁糊眼，削掉对手命中", "对着走位方向连喷，逼对手躲开股间间隙"],
        kind: "aim",
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
        indicator: function () { return { radius: 0.6, geometry: "point", style: "ink", color: 0x1B1B24, label: "章鱼桶炮" }; },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
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
                        // 整次施放最多成功降一次命中；只有真的降下来才在脸上罩墨。
                        if (!blinded && currentWorld.random() < chance) {
                            const dropped = NativeEffects.boost(currentWorld, target, "accuracy", -blind);
                            if (dropped !== 0) {
                                blinded = true;
                                WorldFeedback.keep(currentWorld, "octazooka:face:" + String(target.ref()), octazookaScene, 1, at.position(),
                                    { moment: "face", target: String(target.ref()), stage: blind, drops: drops, intensity: intensity }, 70);
                                WorldFeedback.text(currentWorld, at.position().plus(WorldCombat.point(0, 1.1, 0)),
                                    "world_combat.move.octazooka.text.blind", [Math.abs(dropped)], 30);
                            }
                        }
                    }
                }
                // 首碰方块留一小块装饰墨；它不是持续伤害，也不画危险圈。
                const cell = hit.blockPosition();
                if (!stained && cell !== null) {
                    stained = true;
                    WorldFeedback.emit(currentWorld, octazookaScene, 1, point,
                        { moment: "stain", drops: drops, direction: octazookaNormal(hit.blockFace()), surface: 1 }, stainTicks);
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
                // 合法当前输入：有真实目标就朝它并保留原有限转向；否则用提交的瞄准方向。
                const live = targetRef === "" ? null : currentWorld.actor(targetRef);
                const liveBody = live !== null && currentWorld.valid(live) ? currentWorld.observe(live) : null;
                const aimPoint = liveBody !== null ? liveBody.position() : current.targetPosition();
                const raw = aimPoint.minus(from);
                const base = raw.length() < 0.01 ? current.direction() : raw.unit();
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:particle/generic/goo/chemicalball", scale: Math.max(0.7, radius / 0.2), tint: 0x1B1B24 };
                if (live !== null && currentWorld.valid(live))
                    appearance.homing = { target: targetRef, turn: steer, delay: 1, range: current.range() };
                const flight = LivingActions.projectile(current, {
                    speed: velocity, range: current.range(), radius: radius, lifetime: 160,
                    direction: octazookaJitter(base, spread, currentWorld),
                    appearance: appearance,
                    impact: onShot
                }, onComplete);
                WorldFeedback.emit(currentWorld, octazookaScene, 1, from,
                    { moment: "jet", projectile: flight, shot: fired, shots: shots, drops: drops,
                        muzzle: Math.max(6, Math.round(drops * 0.3)), intensity: intensity, scale: scale }, 20);
                WorldFeedback.emit(currentWorld, octazookaScene, 1, from,
                    { moment: "flight", projectile: flight, drops: drops, intensity: intensity, scale: scale }, 50);
                if (fired < shots) current.after(interval, fire);
            }
            sound(action, "minecraft:entity.squid.squirt");
            fire(action);
        }
    });
}
