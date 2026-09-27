/**
 * 龙之俯冲 / dragonrush 的出手方式。
 *
 * 核心念头：先把杀气铺成一圈可见的威压把人镇住，再从高处沿一条弧线俯冲砸在锁定点上；被杀气罩住、
 *   被速度差镇住的目标，更容易被这一撞撞懵。起手那圈威压、以及起跳时定下的真实落点，就是这招的身份。
 *
 * 三幕：
 *   起（windup，提交前）：杀气在身周铺开成圈，地面被压出纹路；`menace`（威压半径）越大铺得越开。
 *   扑（execute，提交后）：起跳时锁定落点、同时定下偏差（`accuracy` 越高越贴合），把真实落点连同预告圈一起画出来；
 *       随后朝真实落点腾起、平飞、下坠，全部用身体位移完成。撞顶/侧墙先停飞行，再自然下落到真实接触点。
 *   落（impact / miss）：只有真实落地/接触才结算地面冲击——以真实接触点为中心，逐个检查遮挡，命中者各吃一记
 *       `dive` 接触伤害、被顶开 `push` 格，并按各自速度差掷一次畏缩。没能找到地面时只在真实停止点扬尘，不隔空炸圈。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。打断用 `LivingActions.requestInterrupt`
 * 返回本次真正结束的动作数，没打断到动作也照常吃伤。
 *
 * 与同族分开：泰山压顶是原地坐压、靠体重压麻；龙之俯冲先亮杀气再前扑；疯狂滚压贴地滚过一排、不腾空。
 */
namespace PokemonSkills {
    /** 打断回执：先挂畏缩状态，再请求原生打断，返回本次真正结束的动作数；状态被拒绝返回 -1。 */
    function dragonrushFlinch(world: CombatWorld, target: CombatActor, ticks: number): number {
        if (MobEffects.apply(world, target, dragonrushFlinchEffect, ticks, 0) === null) return -1;
        return LivingActions.requestInterrupt(world, target);
    }

    /** 候选锁点：aim 的实体或世界点取 targetPosition；只有方向输入时退到身前射程处。 */
    function dragonrushLock(action: CombatAction): CombatPoint {
        try { return action.targetPosition(); } catch (error) { }
        const direction = action.direction();
        const forward = direction.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : direction.unit();
        return action.origin().plus(forward.scale(action.range()));
    }

    /** 在 x/z 处向下找最近的可站立表面，返回真实脚底高度；找不到实体地面（虚空/液体/屏障）返回 null。 */
    function dragonrushFoot(world: CombatWorld, point: CombatPoint, drop: number): CombatPoint | null {
        const x = Math.floor(point.x()), y = Math.floor(point.y()), z = Math.floor(point.z());
        for (let dy = 1; dy >= -Math.max(1, Math.floor(drop)); dy--) {
            const block = world.block(WorldCombat.point(x, y + dy, z));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            return WorldCombat.point(point.x(), y + dy + 1, point.z());
        }
        return null;
    }

    define({
        freeMovement: true,
        id: dragonrushId,
        cooldownParameter: "recharge",
        name: "Dragon Rush",
        description: "先在身周铺开一圈可见的杀气，再从高处沿弧线俯冲砸在锁定点上：落点附近的敌人一起被撞开，扑得比对手越快、越容易把它撞得畏缩。落点在起跳时锁定，砸偏与否也在起跳时决定，预告圈直接画在真实落点上。可以瞄敌人也可以直接点落点；头顶净空决定能腾多高，撞到墙或天花板后先停飞行、再自然下落到真实接触点才结算，不会隔着障碍轰在原锁点上。",
        uses: ["先亮一圈威压、再前扑砸在锁定点上", "把落点周围的敌人一起撞开", "用速度差把对手镇得无法出手", "在开阔处朝任意落点扑砸"],
        kind: "aim",
        range: 5.0,
        maxRange: 8.0,
        prepare: 10,
        active: 0,
        recover: 12,
        cooldown: 38,
        style: "dive",
        defaults: { dread: false, ai: { maxChase: 10 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(dragonrushId, "menace", pokemon), geometry: "area", style: "dive", color: 0x7C6BE8,
                label: config && config.dread === true ? "威压·龙之俯冲" : "龙之俯冲" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[dragonrushId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(dragonrushId, "tempo", context)),
                recover: Math.round(p(dragonrushId, "settle", context)),
                cooldown: Math.round(p(dragonrushId, "recharge", context)),
                active: 0,
                range: p(dragonrushId, "menace", context) + 2.2
            };
        },
        windup: function (action, config, prepare) {
            const lock = dragonrushLock(action);
            action.present("dragonrush:menace", dragonrushScene, 1, action.origin(),
                JSON.stringify({ moment: "menace", menace: p(dragonrushId, "menace", action), windup: prepare,
                    dread: config && config.dread === true, lock: 1, point: [lock.x(), lock.y(), lock.z()],
                    lockRadius: p(dragonrushId, "landRadius", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(dragonrushScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            // 落点在起跳这一刻锁死，偏差也在这一刻定死：aim 实体锚在它身上、点则取那个点，飞行途中不再改。
            const power = p(dragonrushId, "dive", action);
            const accuracy = p(dragonrushId, "accuracy", action);
            const radius = p(dragonrushId, "landRadius", action);
            const flinchTicks = Math.round(p(dragonrushId, "flinchTicks", action));
            const push = p(dragonrushId, "push", action);
            const hopMax = p(dragonrushId, "hop", action);
            const air = Math.max(6, Math.round(p(dragonrushId, "airTicks", action)));
            const dust = Math.max(10, Math.round(p(dragonrushId, "dust", action)));
            const intensity = Math.max(0.6, Math.min(2.3, power / 80));
            const dread = config && config.dread === true;
            const context: FactContext = { pokemon: null, skill: skills[dragonrushId], detail: { values: config },
                world: world, actor: actor, action: action };
            // 砸偏时本体真的落在偏出去的方向上；预告圈画在真实落点，对手在滞空期走开就能躲。
            const wide = world.random() >= accuracy;
            let landing = dragonrushLock(action);
            if (wide) {
                const angle = world.random() * Math.PI * 2;
                const away = Math.max(1, radius) * (0.55 + world.random() * 0.85);
                landing = WorldCombat.point(landing.x() + Math.cos(angle) * away, landing.y(), landing.z() + Math.sin(angle) * away);
            }
            const foot = dragonrushFoot(world, landing, 8);
            if (foot !== null) landing = foot;
            const delta = landing.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 1e-6 ? WorldGeometry.flatUnit(aim(action), action.direction()) : flat.unit();
            const approach = Math.max(0, Math.min(flat.length() - 0.3, action.range()));
            // 腾空高度受当前空间约束：天花板低就矮跳，开阔处才铺满；不硬塞最低跳高。
            const hop = self === null ? 0 : Math.max(0, Math.min(hopMax, dragonrushHeadroom(world, self, hopMax)));
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const horizontal = approach / air;
            const up = hop / rise;
            const down = hop / fall;
            const descent = Math.max(0.4, down);
            let settled = false;
            let elapsed = 0;
            let phase = 0;

            // 预告圈独立存续到落地：不靠 windup 的 menace 同 moment 续期，偏移一并在起跳时画出来。
            action.present("dragonrush:lock", dragonrushScene, 1, landing,
                JSON.stringify({ moment: "lock", lockRadius: radius, dread: dread, miss: wide ? 1 : 0 }));
            sound(action, "minecraft:entity.ender_dragon.flap");
            scenes.show(action, "leap", origin, { moment: "leap", hop: hop, dust: dust, wide: wide ? 1 : 0 });

            function fadeLock(current: CombatAction): void {
                current.present("dragonrush:lock", dragonrushScene, 1, landing,
                    JSON.stringify({ moment: "lock", lockRadius: 0, lifecycle: { reason: "settled", tick: current.world().tick() } }));
            }

            function land(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                fadeLock(current);
                WorldFeedback.emit(scope, dragonrushScene, 1, at,
                    { moment: "crash", outer: radius, dust: dust, intensity: intensity }, 32);
                sound(current, "cobblemon:impact.dragon");
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2.5, above: 3 }),
                    function (target, facts) {
                        // 从真实接触点检查遮挡：墙后的敌人不吃这一圈。
                        if (WorldGeometry.blockHit(scope, at, facts.position()) !== null) return;
                        if (!hurt(current, target, dragonrushId, power, { damage: damageSpec(dragonrushId, "dive"), contact: true })) return;
                        hits++;
                        const away = facts.position().minus(at);
                        if (scope.valid(target) && away.length() >= 0.05) scope.hitDisplace(target, away.unit().scale(push));
                        WorldFeedback.emit(scope, dragonrushScene, 1, facts.position(),
                            { moment: "impact", target: String(target.ref()), dust: dust, intensity: intensity }, 26);
                        // 畏缩按各实际敌人的速度差单独掷。
                        const chance = p(dragonrushId, "flinchChance", withTarget(context, target));
                        if (scope.random() < chance) {
                            const ended = dragonrushFlinch(scope, target, flinchTicks);
                            if (ended >= 0) {
                                WorldFeedback.emit(scope, dragonrushScene, 1, facts.position(),
                                    { moment: "stagger", target: String(target.ref()) }, 24);
                                WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.4, 0)), dragonrushFlinchText, [], 24);
                                if (ended > 0) {
                                    WorldFeedback.emit(scope, dragonrushScene, 1, facts.position(),
                                        { moment: "interrupt", target: String(target.ref()) }, 18);
                                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.7, 0)), dragonrushInterruptText, [], 20);
                                }
                            }
                        }
                    });
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.5, 0)),
                    hits > 0 ? dragonrushHitText : dragonrushMissText, hits > 0 ? [hits] : [], 28);
                scenes.finish(current, done);
            }

            /** 找不到地面时的收束：只在真实停止点扬尘，不结算地面圈。 */
            function fade(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                fadeLock(current);
                WorldFeedback.emit(scope, dragonrushScene, 1, at, { moment: "miss", dust: dust, intensity: intensity }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.5, 0)), dragonrushMissText, [], 28);
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { fade(current, current.origin()); return; }
                if (elapsed >= air) phase = 2;
                if (phase === 2) {
                    // 真实下降直到接触：native 落地/撞墙才算，绝不在半空结算地面圈。
                    const before = body.position();
                    const moved = scope.displace(actor, WorldCombat.point(0, -descent, 0));
                    const after = scope.observe(actor);
                    elapsed++;
                    if (after === null || after.grounded() || moved < descent * 0.5) {
                        land(current, after === null ? before : after.position());
                        return;
                    }
                    if (elapsed > air + 60) { fade(current, after.position()); return; }
                    current.after(1, advance);
                    return;
                }
                const vertical = elapsed < rise ? up : -down;
                const movedHorizontal = horizontal > 0.02 ? scope.displace(actor, heading.scale(horizontal)) : 0;
                const movedVertical = Math.abs(vertical) > 0.02 ? scope.displace(actor, WorldCombat.point(0, vertical, 0)) : 0;
                elapsed++;
                // 平飞被墙挡，或上升被天花板压住：先停飞行，交给实际下落。
                if (horizontal > 0.02 && movedHorizontal < horizontal * 0.5) { phase = 2; }
                else if (elapsed <= rise && up > 0.02 && movedVertical < up * 0.5) { phase = 2; }
                else if (elapsed >= air) { phase = 2; }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
