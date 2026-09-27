/**
 * 溶解液 / acid —— 注册与动作。
 *
 * 三幕：
 *   起（windup，提交前）：酸囊鼓起、酸滴在口边聚集（`action.present` 预告）。
 *   泼（splash，提交后）：按重力解算低弧弹道把酸团送到准点；碰撞回执里的活物先吃一次直击，与落点有没有支撑无关。
 *       命中顶面/侧面/实体后向下找真实碰撞支撑，找到才摊开并铺池；没有选中敌人也能对着空点主动铺池。
 *   留（pool）：落点溅到周围可达的敌人，各自掷一次碾防（共享 `NativeEffects.boost(..., "spd", -1)`）；
 *       同时在地面租借一滩腐蚀酸池，按 `poolPulse` 反复咬没走开的人，到 `poolTicks` 散去。
 *
 * 酸池是一个真实的 `WorldEffects` 场地效果（规则 `world_combat:acid_pool` 由本单元注册），以施法者为源、
 * 落在世界坐标上，施法者被收回/远离则随之结束；它的伤害走本招的 `pool` 伤害段。
 *
 * 落点规则：支撑用向下 `world.clipBlocks` 的真实碰撞顶面（花草、液体这类无碰撞面不算），侧面先沿外法线退到
 * 贴面外一格的列再向下找，只往下、不跨到命中点上方楼层（悬空命中因此不留悬空池）。即时泼溅也从落点检查到
 * 受击身体的可达线，隔墙的人不算；池内只对贴近池面且在场地视线内的敌人周期结算。
 *
 * 与同族分开：磨防四式里只有它把东西留在场上，单发最轻、冷却最短、PP 最多。
 * 配置 `corrode`（腐蚀强化）由 resolve 改时序、由公式改酸池与单发。
 */
namespace PokemonSkills {
    const acidScene = "world_combat:move_acid";
    const acidSunderText = "world_combat.move.acid.text.sunder";

    /** 命中点向下找到的真实碰撞顶面；花草、液体这类无碰撞面不算，悬空也返回 null。AI 预测落点同用。 */
    export function acidSupport(world: CombatWorld, point: CombatPoint): CombatPoint | null {
        const hit = world.clipBlocks(point.plus(WorldCombat.point(0, 0.25, 0)), point.minus(WorldCombat.point(0, 12, 0)));
        if (hit === null || !hit.blocked() || hit.blockFace() !== "up") return null;
        return hit.position();
    }

    /**
     * 酸团实际摊开的落点：命中顶面时接触点就是支撑；命中侧面时沿外法线退到贴面外一格的列再向下找；
     * 实体命中与其它面从接触点向下找。只向下找、不跨到命中点上方楼层，找不到就返回 null（不留悬空池）。
     */
    function acidLanding(world: CombatWorld, hit: CombatImpact): CombatPoint | null {
        const face = hit.blockFace();
        if (face === "up") return hit.position();
        let column = hit.position();
        const cell = hit.blockPosition();
        if (cell !== null && (face === "east" || face === "west" || face === "north" || face === "south")) {
            const nx = face === "east" ? 1 : face === "west" ? -1 : 0;
            const nz = face === "south" ? 1 : face === "north" ? -1 : 0;
            column = WorldCombat.point(Math.floor(cell.x()) + 0.5 + nx, hit.position().y(), Math.floor(cell.z()) + 0.5 + nz);
        }
        return acidSupport(world, column);
    }

    /** 腐蚀酸池：圈内非友方每 `pulse` 刻挨一次 `damage` 的酸，按每人各自计时。 */
    WorldEffects.fieldRule("world_combat:acid_pool", {
        scan: function (effect, world, field) {
            const point = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            world.present("acid:pool", acidScene, 1, point,
                JSON.stringify({ moment: "pool", pool: field.data.radius, drops: field.data.drops }));
            world.present("acid:boundary", "world_combat:acid_boundary", 1, point,
                JSON.stringify({ radius: field.data.radius }));
        },
        stay: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            const point = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            // 贴近池面才算踩进去；场地本身的视线检查已排除隔墙的敌人，这里再限住高度带，避免咬到上一层的人。
            if (!WorldGeometry.ring(point, 0, field.data.radius, { below: 1, above: 2 }).contains(body.position())) return;
            const next = field.data.next || (field.data.next = {}), ref = String(actor.ref());
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + Math.max(4, Math.round(field.data.pulse || 20));
            hurt(world, actor, "acid", Math.max(0, field.data.damage || 0), { damage: damageSpec("acid", "pool") });
        }
    });

    define({
        id: "acid",
        name: "Acid",
        description: "低弧抛出一团强酸（弹道会算到准点）：命中活物即造成一次伤害；命中处若落到真实可站的碰撞面，酸就在落点摊开、溅到周围可达的敌人身上，并留下一滩腐蚀酸池反复咬没走开的人。没有选中敌人也能对着空点主动铺池；落点悬空或只是花草、液体时只散开、不留池。命中时有概率让目标特防下降 1 级。",
        uses: ["近距离一次溅到落点周围", "在地面留下持续腐蚀的酸池封住一片地", "用最便宜的出手反复磨特防"],
        kind: "aim",
        range: 10,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 24,
        style: "corrosive",
        defaults: { corrode: false, ai: { maxChase: 12, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("acid", "poolRadius", pokemon), geometry: "area", style: "corrosive",
                color: 0x7FB53A, label: config && config.corrode === true ? "腐蚀溶解液" : "溶解液" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["acid"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const corrode = !!(config && config.corrode);
            return {
                prepare: Math.round(p("acid", "tempo", context)),
                recover: 8,
                cooldown: 24 + (corrode ? 6 : 0),
                active: 0,
                range: p("acid", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:acid:" + action.id(), acidScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", corrode: config && config.corrode ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const power = p("acid", "core", action);
            const poolPower = p("acid", "pool", action);
            const speed = p("acid", "globSpeed", action);
            const gravity = p("acid", "globGravity", action);
            const radius = p("acid", "globRadius", action);
            const poolRadius = p("acid", "poolRadius", action);
            const poolTicks = Math.max(40, Math.round(p("acid", "poolTicks", action)));
            const poolPulse = Math.max(6, Math.round(p("acid", "poolPulse", action)));
            const chance = p("acid", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("acid", "sunderStage", action)));
            const drops = Math.max(8, Math.round(p("acid", "drops", action)));
            const scale = Math.max(0.6, Math.min(2.4, poolRadius / 2.2));
            let settled = false, struck = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 命中活物或方块时结算：直击先按碰撞回执结算，只有落到真实支撑才展开泼溅并在支撑处留下酸池。 */
            function splash(current: CombatAction, hit: CombatImpact): void {
                struck = true;
                const scope = current.world();
                const impact = hit.position();
                const primary = hit.target();
                let hitCount = 0;
                function bite(target: CombatActor): void {
                    if (!hurt(current, target, "acid", power, { damage: damageSpec("acid", "core") })) return;
                    hitCount++;
                    if (scope.valid(target) && scope.random() < chance) {
                        const applied = NativeEffects.boost(scope, target, "spd", -stages);
                        if (applied !== 0) {
                            const at = scope.observe(target);
                            if (at !== null)
                                WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), acidSunderText, [stages], 30);
                        }
                    }
                }
                // 直击与有没有落脚点无关：撞到活物就先结算它，空中命中也有这一下。
                if (primary !== null && scope.valid(primary) && !scope.friendly(primary)) bite(primary);
                const landing = acidLanding(scope, hit);
                // 找不到真实支撑：酸团只在命中处散一记身体酸滴，不留悬空池。
                if (landing === null) {
                    WorldFeedback.emit(scope, acidScene, 1, impact,
                        { moment: "fizzle", drops: drops, scale: scale, intensity: Math.max(0.4, Math.min(2, power / 40)) }, 18);
                    sound(current, "cobblemon:move.acid.target");
                    finish(current);
                    return;
                }
                const region = WorldGeometry.ring(landing, 0, poolRadius, { below: 2, above: 3 });
                WorldGeometry.selectEnemies(scope, region, function (other, facts) {
                    if (primary !== null && String(other.ref()) === String(primary.ref())) return;
                    // 隔墙的人吃不到即时泼溅：从落点到身体要真实可达。
                    if (!scope.clear(landing, facts.position())) return;
                    bite(other);
                });
                WorldFeedback.emit(scope, acidScene, 1, landing,
                    { moment: "splash", target: primary === null ? "" : String(primary.ref()), drops: drops,
                        hitCount: hitCount, radius: poolRadius, scale: scale, intensity: Math.max(0.5, Math.min(2, power / 40)) }, 28);
                const pool = WorldGeometry.ring(landing, 0, poolRadius, { below: 2, above: 3 });
                WorldEffects.field(scope, "world_combat:acid_pool", landing, pool.radius(),
                    { damage: poolPower, pulse: poolPulse, radius: poolRadius, drops: drops, next: {} }, poolTicks);
                sound(current, "cobblemon:move.acid.target");
                finish(current);
            }

            sound(action, "cobblemon:move.acid.actor");
            // 低弧弹道解算：按本招实际重力求初速方向，酸团落在准点上（空中的实体会被真正抛到）；无解时退回直瞄。
            const aimPoint = action.targetPosition(), offset = aimPoint.minus(action.origin());
            const arc = offset.length() < 0.01 ? null : LivingActions.ballistic(action.origin(), aimPoint, speed, gravity);
            const direction = arc || (offset.length() < 0.01 ? action.direction() : offset.unit());
            let flight = "";
            flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 200, direction: direction,
                appearance: { sprite: "cobblemon:generic/goo/chemicalball", tint: 0x8FCB3A, glow: false, scale: Math.max(0.8, radius / 0.2) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    splash(current, hit);
                }
            }, function (current: CombatAction) {
                // 整团飞空、没落上任何东西：按真实末点散一记；读不到末点就不补画，也不假造终点。
                if (!struck) {
                    const end = current.world().projectilePosition(flight);
                    if (end !== null)
                        WorldFeedback.emit(current.world(), acidScene, 1, end,
                            { moment: "fizzle", drops: drops, scale: scale, intensity: Math.max(0.4, Math.min(2, power / 40)) }, 18);
                }
                finish(current);
            });
            action.present("acid:throw", acidScene, 1, action.origin(),
                JSON.stringify({ moment: "throw", projectile: flight, drops: drops, scale: scale,
                    intensity: Math.max(0.5, Math.min(2, power / 40)) }));
        }
    });
}
