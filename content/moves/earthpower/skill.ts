/**
 * 大地之力 / earthpower —— 注册与动作。
 *
 * 三幕：
 *   记（mark，提交前）：起手就把要掀的那块地面定下来并标出记号（`action.present` 预告）——这是对手走位的窗口；
 *       选点向下用真实方块碰撞找首个支撑面，植被等无碰撞的伪地自然落空，空中落到最远的合法支撑面。
 *   爆（erupt → hit）：提交后地脉从记号那一点自下而上崩开；与记号站在同一支撑面、脚下距离内的敌人各结算一次
 *       特殊伤害，被向上顶起 `launch`，并按概率用共享 `NativeEffects.boost(..., "spd", -1)` 压低特防（读实际降级数）；
 *       离地的目标从地脉上方过去，什么也吃不到（原生 nonsky 的翻译）。
 *
 * 选取 `kind: "aim"`——自由点地面或方向都能放，可预置敌人将走到的位置；爆发只用起手锁定的同一点，不再追脚。
 * 与同族分开：磨防远击四式里唯一没有飞行物、从地面出手、只打站在地上的目标、并只认真实碰撞支撑面的那个。
 * 配置 `fissure`（裂隙式）由 resolve 改时序、由公式改爆发半径／碎土／威力。
 */
namespace PokemonSkills {
    const earthpowerScene = "world_combat:move_earthpower";
    const earthpowerSunderText = "world_combat.move.earthpower.text.sunder";
    const earthpowerMissText = "world_combat.move.earthpower.text.miss";
    const earthpowerSurfaceKey = "world_combat:earthpower/surface";

    /**
     * 从所选点向下用原生方块碰撞找真实支撑面（返回支撑面上方的点）；植被等无碰撞方块不被当作地面。
     * 直下没有地面时沿 origin→selected 逐步回退，退回最远的合法支撑面；仍然没有就返回 null（空中不造地震）。
     */
    function earthpowerSurface(world: CombatWorld, origin: CombatPoint, selected: CombatPoint, drop: number, reach: number): CombatPoint | null {
        function probe(x: number, z: number, fromY: number): CombatPoint | null {
            const hit = world.clipBlocks(WorldCombat.point(x + 0.5, fromY + 1, z + 0.5), WorldCombat.point(x + 0.5, fromY - drop, z + 0.5));
            if (hit === null || !hit.blocked()) return null;
            const cell = hit.blockPosition();
            if (cell === null) return null;
            return WorldCombat.point(x + 0.5, cell.y() + 1, z + 0.5);
        }
        const baseY = Math.floor(selected.y());
        const direct = probe(Math.floor(selected.x()), Math.floor(selected.z()), baseY);
        if (direct !== null) return direct;
        const flat = WorldCombat.point(selected.x() - origin.x(), 0, selected.z() - origin.z());
        const span = flat.length();
        if (span < 0.05) return null;
        const back = flat.scale(1 / span);
        for (let step = 0.75; step <= reach; step += 0.75) {
            const at = selected.minus(back.scale(step));
            const found = probe(Math.floor(at.x()), Math.floor(at.z()), baseY);
            if (found !== null) return found;
        }
        return null;
    }

    define({
        id: "earthpower",
        name: "Earth Power",
        description: "朝方向或点指定一块地面，起手先记号、随后自下而上崩开：只命中与落点站在同一支撑面上、脚下就在记号范围内的敌人，造成特殊伤害并把它们顶起，可能压低特防 1 级；离地的目标从地脉上方过去。走出记号或飞到空中都能避开。",
        uses: ["隔一段距离在地面掀起一柱地脉", "把站在上面的对手顶离地面", "把落点预置在敌人将走到的位置", "站在与落点不同一层地面的对手不会被误伤"],
        kind: "aim",
        range: 12,
        maxRange: 17,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 30,
        style: "tectonic",
        defaults: { fissure: false, ai: { maxChase: 14, stillFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("earthpower", "burstRadius", pokemon), geometry: "area", style: "tectonic",
                color: 0xA87B3A, label: config && config.fissure === true ? "裂隙大地之力" : "大地之力" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["earthpower"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const fissure = !!(config && config.fissure);
            return {
                prepare: Math.round(p("earthpower", "tempo", context)),
                recover: 9,
                cooldown: 30 + (fissure ? 4 : 0),
                active: 0,
                range: p("earthpower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 起手锁定落点：向下找真实支撑面；目标是活物时按短距离速度估计提前量，之后不再追。
            const world = action.sense(), origin = action.origin();
            const radius = Math.max(1.3, p("earthpower", "burstRadius", action));
            let selected = action.targetPosition();
            const target = action.target();
            const body = target !== null && world.valid(target) ? world.observe(target) : null;
            if (body !== null) {
                const velocity = body.velocity();
                const cap = Math.max(1.0, radius * 0.9);
                let lead = WorldCombat.point(velocity.x(), 0, velocity.z()).scale(Math.min(10, Math.max(0, prepare)));
                if (lead.length() > cap) lead = lead.unit().scale(cap);
                selected = body.position().plus(lead);
            }
            const surface = earthpowerSurface(world, origin, selected, 24, action.range());
            const at = surface !== null ? surface : selected;
            action.data(earthpowerSurfaceKey, JSON.stringify(surface === null ? { found: false }
                : { found: true, x: surface.x(), y: surface.y(), z: surface.z() }));
            action.present("world_combat:earthpower:" + action.id(), earthpowerScene, 1, at,
                JSON.stringify({ moment: "mark", radius: radius, windup: prepare, fissure: config && config.fissure ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const stored = action.data(earthpowerSurfaceKey);
            let point: CombatPoint | null = null;
            if (stored !== null) {
                const locked = JSON.parse(stored);
                if (locked && locked.found === true) point = WorldCombat.point(locked.x, locked.y, locked.z);
            }
            const power = p("earthpower", "core", action);
            const radius = Math.max(1.3, p("earthpower", "burstRadius", action));
            const launch = p("earthpower", "launch", action);
            const chance = p("earthpower", "sunderChance", action);
            const stages = Math.max(1, Math.round(p("earthpower", "sunderStage", action)));
            const shards = Math.max(12, Math.round(p("earthpower", "shards", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 1.7));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const column = Math.max(0.6, Math.min(6, launch * 8));
            let hits = 0;

            if (point === null) {
                // 空中没有真实支撑面：只在落点落空，不在空中造地震。
                const at = action.targetPosition();
                WorldFeedback.emit(world, earthpowerScene, 1, at, { moment: "miss", radius: radius, scale: scale }, 20);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.8, 0)), earthpowerMissText, [], 24);
                sound(action, "minecraft:block.gravel.break");
                done(action);
                return;
            }

            sound(action, "cobblemon:impact.ground");
            WorldFeedback.emit(world, earthpowerScene, 1, point,
                { moment: "erupt", radius: radius, shards: shards, column: column, scale: scale, intensity: intensity }, 30);

            // 爆发复验：只打与记号同处一个真实支撑面、脚下距离在爆发半径内的敌人，不跨上下平台。
            WorldGeometry.selectBodies(world, WorldGeometry.bodySphere(point, radius), function (enemy, facts) {
                if (String(enemy.ref()) === String(action.actor().ref()) || world.friendly(enemy)) return;
                if (!facts.grounded()) return;
                const feet = facts.boundsMin();
                if (Math.abs(feet.y() - point.y()) > 1.0) return;
                const dx = facts.position().x() - point.x(), dz = facts.position().z() - point.z();
                if (Math.sqrt(dx * dx + dz * dz) > radius) return;
                if (!hurt(action, enemy, "earthpower", power, { damage: damageSpec("earthpower", "core") })) return;
                hits++;
                if (world.valid(enemy)) world.hitImpulse(enemy, WorldCombat.point(0, launch, 0));
                WorldFeedback.emit(world, earthpowerScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), radius: radius, shards: shards, column: column, scale: scale, intensity: intensity }, 24);
                if (world.valid(enemy) && world.random() < chance) {
                    const dropped = NativeEffects.boost(world, enemy, "spd", -stages);
                    const at = world.observe(enemy);
                    if (dropped !== 0 && at !== null)
                        WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.2, 0)), earthpowerSunderText, [Math.abs(dropped)], 30);
                }
            });

            if (hits === 0)
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), earthpowerMissText, [], 24);
            done(action);
        }
    });
}
