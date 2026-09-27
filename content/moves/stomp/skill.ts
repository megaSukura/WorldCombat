/**
 * 踩踏 / stomp 的出手方式。
 *
 * 核心念头：把全身重量往下砸——高高抬起、对准目标落脚；砸中的那一下最重，脚下的震波还把附近站着的人一起震懵，
 * 落点画出一圈被踩实的压痕（只画画面，不改动方块）。它只砸得到**站在地上**的目标：空中的人躲得开（原生的 nonsky 落成可读的反制）。
 *
 * 三幕：
 *   起（raise，提交前）：抬脚、沉身，脚边尘土上跳的预告；同刻锁定唯一的可达落点。
 *   砸（slam → hit / whiff）：提交后不移动，整只身体落到锁定的落点上；目标站在地上且与脚掌体积真实接触就结算 slam 伤害、
 *       按 flinchChance 掷畏缩，并以落点为心震出 shock 半径：圈内其他站在相连地面上的敌人各吃一记 aftershock、
 *       按 staggerChance 掷畏缩。目标在空中或已走出脚印则踩空，只压出脚下的痕。
 *   痕（impression）：落点画一圈被踩实的脚印压痕，停留一会儿后自然淡去；不替换任何方块。
 *
 * 与同族分开：重踏是一圈外推的地裂、跺脚是一条朝目标的地缝、咬住是钩住拉近、骨棒是长柄横扫；
 * 只有踩踏是**垂直下砸、单体最重、附带一小圈震波、且只认站在地上的对手**。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `heavy`（重踏式）由 resolve 改时序、由公式改威力／范围，提交后才触碰世界。
 */
namespace PokemonSkills {
    const stompScene = "world_combat:move_stomp";
    const stompFlinchEffect = "world_combat:stomp_flinch";
    const stompHitText = "world_combat.move.stomp.text.hit";
    const stompFlinchText = "world_combat.move.stomp.text.flinch";
    const stompShockText = "world_combat.move.stomp.text.shock";
    const stompMissText = "world_combat.move.stomp.text.miss";
    /** 起手锁定的踩点；兑现时读回同一点，目标走出脚印就避开主击。 */
    const stompLandingKey = "world_combat:move_stomp/landing";

    function stompLanding(action: CombatAction): CombatPoint | null {
        const raw = action.data(stompLandingKey);
        if (raw === null) return null;
        const value = JSON.parse(raw);
        if (!value || typeof value.x !== "number" || typeof value.y !== "number" || typeof value.z !== "number") return null;
        return WorldCombat.point(value.x, value.y, value.z);
    }

    function stompFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, stompFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /**
     * 起手与兑现共用同一个可达落点：先把瞄准点夹进射程、被真实墙面截断，再落到脚下地面。
     * 预告的脚印和真正踩下去的位置因此是同一个点；目标走出这个脚印就避开主击。
     */
    function stompResolveLanding(world: CombatWorld, actor: CombatActor, aim: CombatPoint, range: number): CombatPoint {
        const body = world.observe(actor);
        const origin = body === null ? aim : body.position();
        const offset = aim.minus(origin);
        let landing = offset.length() > range ? origin.plus(offset.unit().scale(range)) : aim;
        const wall = WorldGeometry.blockHit(world, origin, landing);
        if (wall !== null) landing = wall.position();
        return WorldGeometry.ground(world, landing, 4);
    }

    /** 落点到目标脚下之间没有墙或断层：震波只沿相连的地面扩散；射线抬到脚踝高度，避免擦到地面方块。 */
    function stompConnected(world: CombatWorld, landing: CombatPoint, target: CombatObservation): boolean {
        const foothold = WorldGeometry.ground(world, target.position(), 3);
        const ankle = WorldCombat.point(0, 0.2, 0);
        return WorldGeometry.blockHit(world, landing.plus(ankle), foothold.plus(ankle)) === null;
    }

    define({
        requiresGround: true,
        id: "stomp",
        cooldownParameter: "recharge",
        name: "Stomp",
        description: "把全身重量往下砸的一脚：朝选定的近处地表落脚，正下方站在脚印里的目标吃最重的一击、有机会被踩懵，脚下的震波还会波及落点周围站在相连地面上的其他敌人——走出脚印就能避开主击，腾空的人躲得开震波，隔墙或另一层的人不会被震到。",
        uses: ["把靠近的地面目标一脚踩实，并尝试震懵", "顺带震到落点周围站在相连地面上的其他敌人", "在对手被逼到地面时兑现最重的一击"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.2,
        prepare: 10,
        active: 14,
        recover: 9,
        cooldown: 26,
        style: "stomp",
        defaults: { heavy: false, ai: { maxChase: 7, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("stomp", "shock", pokemon) : 1.6, geometry: "area", style: "stomp",
                color: 0x8A7A62, label: config && config.heavy === true ? "重踏" : "踩踏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["stomp"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("stomp", "tempo", context)),
                recover: Math.round(p("stomp", "aftercast", context)),
                cooldown: Math.round(p("stomp", "recharge", context)),
                active: skills["stomp"].active
            };
        },
        windup: function (action, config, prepare) {
            // 起手锁定可达的实际脚点：夹进射程、被墙面截断、贴到地面。兑现时读回同一点。
            const world = action.sense(), actor = action.actor();
            const foot = p("stomp", "foot", action);
            const landing = stompResolveLanding(world, actor, action.targetPosition(), skills["stomp"].range);
            action.data(stompLandingKey, JSON.stringify({ x: landing.x(), y: landing.y(), z: landing.z() }));
            action.present("world_combat:stomp:" + action.id(), stompScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", heavy: config && config.heavy === true, windup: prepare }));
            action.present("world_combat:stomp:mark:" + action.id(), stompScene, 1, landing,
                JSON.stringify({ moment: "mark", foot: foot, heavy: config && config.heavy === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }

            const power = p("stomp", "slam", action);
            const shockPower = p("stomp", "aftershock", action);
            const shock = p("stomp", "shock", action);
            const foot = p("stomp", "foot", action);
            const crater = p("stomp", "crater", action);
            const craterTicks = Math.round(p("stomp", "craterTicks", action));
            const chance = p("stomp", "flinchChance", action);
            const stagger = p("stomp", "staggerChance", action);
            const flinchTicks = Math.round(p("stomp", "flinchTicks", action));
            const scale = foot / 0.5;
            const intensity = Math.max(0.5, Math.min(2.4, power / 80));

            const origin = self.position();
            // 踩点用起手锁定的可达点：预告与落足一致，目标走出脚印就避开主击。
            const landing = stompLanding(action) || stompResolveLanding(world, actor, action.targetPosition(), skills["stomp"].range);
            const heading = WorldGeometry.flatUnit(landing.minus(origin), action.direction());

            WorldFeedback.emit(world, stompScene, 1, landing,
                { moment: "slam", scale: 1, intensity: intensity, foot: foot, shock: Math.round(shock * 100) / 100,
                    quake: Math.max(10, Math.round(shock * 24)), heavy: config && config.heavy === true ? 1 : 0 }, 26);
            sound(action, "minecraft:item.mace.smash_ground_heavy");
            sound(action, "cobblemon:impact.ground");

            // 主击：按脚掌体积与真实碰撞箱选正下方站在地上的最近受击者；移出脚印就躲开主击。
            const footholds: { actor: CombatActor; facts: CombatObservation }[] = [];
            WorldGeometry.selectBodies(world, WorldGeometry.bodySector(landing, heading, Math.max(0.35, foot), 360, { below: 2, above: 1.6 }),
                function (enemy, facts) {
                    if (facts.friendly() || !facts.grounded()) return;
                    footholds.push({ actor: enemy, facts: facts });
                });
            footholds.sort(function (a, b) { return a.facts.position().minus(landing).length() - b.facts.position().minus(landing).length(); });
            const foe = footholds.length ? footholds[0].actor : null;
            if (foe !== null) {
                if (hurt(action, foe, "stomp", power, { damage: damageSpec("stomp", "slam"), contact: true })) {
                    WorldFeedback.emit(world, stompScene, 1, landing,
                        { moment: "hit", target: String(foe.ref()), scale: scale, intensity: intensity,
                            quake: Math.max(10, Math.round(shock * 24)) }, 24);
                    WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.2, 0)), stompHitText, [], 22);
                    if (world.valid(foe) && world.random() < chance && stompFlinch(world, foe, flinchTicks)) {
                        WorldFeedback.emit(world, stompScene, 1, landing, { moment: "flinch", target: String(foe.ref()) }, 24);
                        WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.35, 0)), stompFlinchText, [], 24);
                    }
                }
            } else {
                WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.0, 0)), stompMissText, [], 22);
            }

            // 震波：落点周围站在相连地面上的其他人各吃一记较轻的 aftershock，并按 staggerChance 掷畏缩；不重复主受击者。
            const shakenTargets: { actor: CombatActor; facts: CombatObservation }[] = [];
            WorldGeometry.selectBodies(world, WorldGeometry.bodySector(landing, heading, shock, 360, { below: 2, above: 1 }),
                function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(actor.ref()) || (foe !== null && ref === String(foe.ref()))) return;
                    if (facts.friendly() || !facts.grounded()) return;
                    // 只沿相连地面：隔墙、断层或另一层的敌人不会被震到。
                    if (!stompConnected(world, landing, facts)) return;
                    shakenTargets.push({ actor: enemy, facts: facts });
                });
            shakenTargets.sort(function (a, b) { return a.facts.position().minus(landing).length() - b.facts.position().minus(landing).length(); });
            let shaken = 0;
            for (let index = 0; index < shakenTargets.length && shaken < 3; index++) {
                const entry = shakenTargets[index], enemy = entry.actor, facts = entry.facts, ref = String(enemy.ref());
                if (!hurt(action, enemy, "stomp", shockPower, { damage: damageSpec("stomp", "aftershock") })) continue;
                shaken++;
                WorldFeedback.emit(world, stompScene, 1, facts.position(),
                    { moment: "shock", target: ref, scale: Math.max(0.5, Math.min(2, shock / 1.6)),
                        quake: Math.max(8, Math.round(shockPower * 1.5)) }, 22);
                if (world.valid(enemy) && world.random() < stagger && stompFlinch(world, enemy, flinchTicks)) {
                    WorldFeedback.emit(world, stompScene, 1, facts.position(), { moment: "flinch", target: ref }, 22);
                }
            }
            if (shaken > 0) WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.45, 0)), stompShockText, [shaken], 24);

            // 落脚压痕只是画面：在真实落点画一圈被踩实的痕，不改动任何方块。
            WorldFeedback.emit(world, stompScene, 1, landing,
                { moment: "crater", radius: Math.round(crater * 100) / 100, foot: foot, craterTicks: craterTicks,
                    scale: 1, intensity: intensity }, Math.max(20, craterTicks));
            done(action);
        }
    });

}
