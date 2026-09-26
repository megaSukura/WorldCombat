/**
 * 三连钻 / tripledive 的出手方式。
 *
 * 核心念头：自己连续三次短跳扎下——每一跳都是一段真实的身体短弧（起跳、升到 `leap` 高、沿当刻自由瞄准的落点扎下去），
 *   下落首次碰到敌体、或落地水花范围内有敌人时结算。两钻之间重新读取瞄准，所以能在两跳之间换下一落点、换成另一个敌人，
 *   也可以空跳换位。水花留在对手身上，下一钻因此更重——三下都落在同一个目标上时第三下最狠。
 *
 * 三钻（提交后由本招自己驱动）：
 *   起（windup，提交前）：屈膝收身，脚下水光打转，只播预告。
 *   钻（execute）：按 `interval` 起三次。每次先用 `triplediveAim` 取当刻自由瞄准点，水平方向限制在 `diveSpan` 内得到落点；
 *       起跳沿一条经过真实身体逐刻 `sweepStep` 的短弧上升、越过最高点后下落，落到落点再按 `diveRadius` 扫一次范围结算。
 *       下落途中第一次非友方敌体接触即结算该钻的 `splash` 接触伤害；撞天花板就提前转入下落，中途被墙挡住则落在实际到达处。
 *       命中时把「湿透」（共享身份 `world_combat:status/drenched`）打到该实体并计时；已经湿透的实体这一钻吃 `soakBonus` 倍。
 *   收（finish）：三钻打完或中途失能，收势并结束。
 *
 * 与同族分开：三连箭是三支箭**同时**离弦、骨头回力镖是**同一根骨头去与回**、三连踢/三旋击是原地扫身前；
 *   三连钻是**固定三下、每下都留下水**的真实起落连钻——它的「三」是死的，价值在那层越叠越重的湿身。
 *
 * 配置 `plunge` 由 resolve 改时序、由公式改跳跃／威力／判定，提交后才触碰世界。
 */
namespace PokemonSkills {
    const triplediveScene = "world_combat:move_tripledive";
    const triplediveDrenched = "world_combat:tripledive_drenched";
    const triplediveSplashText = "world_combat.move.tripledive.text.splash";
    const triplediveFullText = "world_combat.move.tripledive.text.full";
    const triplediveMissText = "world_combat.move.tripledive.text.miss";

    /** 当刻自由瞄准：按住技能键时读控制点（每钻之间可换点），AI 或未声明的输入回退到动作选点。 */
    function triplediveAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3)
                return WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
        } catch (error) { }
        try {
            const selected = action.targetPosition();
            if (isFinite(selected.x()) && isFinite(selected.y()) && isFinite(selected.z())) return selected;
        } catch (error) { }
        return action.origin().plus(WorldCombat.point(0, 0, 1));
    }

    /** 落点脚下第一块可站方块的顶面高度；找不到可站方块时退回起跳脚高。 */
    function triplediveGround(world: CombatWorld, x: number, y: number, z: number): number {
        const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
        for (let dy = 0; dy >= -6; dy--) {
            const block = world.block(WorldCombat.point(bx, by + dy, bz));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
            return by + dy + 1;
        }
        return y;
    }

    define({
        freeMovement: true,
        id: "tripledive",
        cooldownParameter: "recharge",
        name: "三连钻",
        description: "自己连续三次短跳扎下：每一跳都先取一个附近的自由瞄准落点，真实起跳、沿落点扎下去；下落首次碰到敌人、或落地水花里有敌人时就结算这一钻。每钻命中都把目标打湿，已经湿透的目标被下一钻打得更重。两跳之间可以重新选点、换一个敌人，也可以空跳换位；墙和天花板会挡住真实的身体移动。",
        uses: ["连续三次短跳扎击，能在两跳间换下一个敌人", "先手把目标打上湿透，让随后两钻吃满加成", "用允许空跳的落点换位、贴近或绕开障碍"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.6,
        prepare: 8,
        active: 60,
        recover: 6,
        cooldown: 28,
        maximumTicks: 240,
        style: "dive",
        defaults: { plunge: false, ai: { maxChase: 5, drenchFirst: true, preferLarge: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("tripledive", "diveSpan", pokemon), geometry: "cone", style: "dive",
                color: 0x4FA8D8, label: config && config.plunge === true ? "深潜三连钻" : "三连钻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["tripledive"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("tripledive", "tempo", context)),
                recover: Math.round(p("tripledive", "recover", context)),
                cooldown: Math.round(p("tripledive", "recharge", context)),
                active: skills["tripledive"].active,
                range: p("tripledive", "diveSpan", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("tripledive:coil", triplediveScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", splashes: Math.round(p("tripledive", "splashes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const body = action.world().observe(actor);
            if (body === null) { done(action); return; }
            const scenes = WorldFeedback.actionScenes(triplediveScene);
            const splash = p("tripledive", "splash", action);
            const soakBonus = Math.max(1, p("tripledive", "soakBonus", action));
            const leap = p("tripledive", "leap", action);
            const span = p("tripledive", "diveSpan", action);
            const radius = p("tripledive", "diveRadius", action);
            const interval = Math.max(2, Math.round(p("tripledive", "interval", action)));
            const drench = Math.max(40, Math.round(p("tripledive", "drenchTicks", action)));
            const splashes = Math.max(6, Math.round(p("tripledive", "splashes", action)));
            const riseSpeed = Math.max(0.2, p("tripledive", "riseSpeed", action));
            const fallSpeed = Math.max(0.3, p("tripledive", "fallSpeed", action));
            const sweepRadius = Math.max(0.05, p("tripledive", "collisionRadius", action));
            const minimumMove = Math.max(0.001, p("tripledive", "minimumMove", action));
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.55));
            const baseIntensity = Math.max(0.5, Math.min(2.0, splash / 22));
            const dives = 3;
            let cast = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            function beginDive(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const start = self.position();
                const up = WorldCombat.point(0, 1, 0);
                const startFeet = start.minus(up.scale(self.height() / 2));
                // 起跳时取自由瞄准落点，水平方向限制在 diveSpan 内。
                const aimPoint = triplediveAim(current);
                let flat = WorldCombat.point(aimPoint.x() - startFeet.x(), 0, aimPoint.z() - startFeet.z());
                if (flat.length() < 0.05) {
                    const facing = WorldCombat.point(current.direction().x(), 0, current.direction().z());
                    flat = facing.length() < 0.05 ? WorldCombat.point(0, 0, span) : facing.unit().scale(span);
                } else {
                    flat = flat.unit().scale(Math.min(span, flat.length()));
                }
                const distance = flat.length();
                const landing = WorldCombat.point(startFeet.x() + flat.x(),
                    triplediveGround(scope, startFeet.x() + flat.x(), startFeet.y(), startFeet.z() + flat.z()),
                    startFeet.z() + flat.z());
                // 短弧：脚坐标上从起跳到落点的抛物线，最高点比起点高 leap；逐刻走这条弧的增量。
                const steps = Math.max(4, Math.min(20, Math.ceil((distance + leap * 2) / Math.max(0.35, riseSpeed))));
                let diveDamaged = false;

                function arcFeet(t: number): CombatPoint {
                    return startFeet.plus(flat.scale(t)).plus(up.scale(leap * 4 * t * (1 - t)));
                }

                function contact(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                    if (diveDamaged) return;
                    diveDamaged = true;
                    scenes.stop(current, "rise");
                    scenes.stop(current, "fall");
                    const live = current.world();
                    const wasDrenched = CombatStatus.has(live, victim, "drenched");
                    const power = splash * (wasDrenched ? soakBonus : 1);
                    const intensity = Math.max(0.6, Math.min(2.4, power / 15));
                    const landed = hurt(current, victim, "tripledive", power, { damage: damageSpec("tripledive", "splash"), contact: true });
                    if (landed) {
                        hits++;
                        CombatStatus.apply(live, victim, "drenched", triplediveDrenched, drench, 0, { unique: true });
                        WorldFeedback.emit(live, triplediveScene, 1, at,
                            { moment: "splash", target: String(victim.ref()), soak: wasDrenched ? 1 : 0,
                                splashes: splashes, scale: scale, intensity: intensity }, 22);
                        WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)),
                            cast === dives - 1 && hits === dives ? triplediveFullText : triplediveSplashText, [cast + 1, hits], 24);
                        live.sound("minecraft:entity.generic.splash", at, 14, "{}");
                    } else {
                        // 伤害被拒绝：不当作命中，也不刷新湿透。
                        WorldFeedback.emit(live, triplediveScene, 1, at,
                            { moment: "land", scale: scale, intensity: Math.max(0.5, intensity * 0.6) }, 16);
                    }
                    advance(current);
                }

                function advance(current: CombatAction): void {
                    scenes.stop(current, "rise");
                    scenes.stop(current, "fall");
                    cast++;
                    if (cast >= dives) { finish(current); return; }
                    current.after(interval, beginDive);
                }

                /** 落到实际到达处：还没打到人就按水花范围再扫一次，仍无敌人就空放。 */
                function landAt(current: CombatAction, at: CombatPoint): void {
                    if (diveDamaged) { advance(current); return; }
                    scenes.stop(current, "rise");
                    scenes.stop(current, "fall");
                    const live = current.world();
                    const around = live.query(at, radius, false);
                    let victim: CombatActor | null = null, best = Infinity;
                    for (let i = 0; i < around.length; i++) {
                        const other = around[i];
                        if (String(other.ref()) === String(actor.ref())) continue;
                        if (live.friendly(other)) continue;
                        const facts = live.observe(other);
                        if (facts === null) continue;
                        const gap = facts.position().minus(at).length();
                        if (gap <= radius && gap < best) { best = gap; victim = other; }
                    }
                    if (victim !== null) {
                        const facts = live.observe(victim);
                        contact(current, victim, facts === null ? at : facts.position());
                        return;
                    }
                    WorldFeedback.emit(live, triplediveScene, 1, at,
                        { moment: "land", scale: scale, intensity: baseIntensity }, 16);
                    WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)), triplediveMissText, [cast + 1], 22);
                    advance(current);
                }

                /** 撞天花板或被挡后：提前沿落点斜坠，仍然只按真实接触结算。 */
                function fallNow(current: CombatAction): void {
                    if (settled) return;
                    scenes.stop(current, "rise");
                    const live = current.world();
                    const moving = live.observe(actor);
                    if (moving === null) { finish(current); return; }
                    const here = moving.position();
                    if (here.y() - moving.height() / 2 <= landing.y() + 0.05) { landAt(current, here); return; }
                    const target = WorldCombat.point(landing.x(), landing.y() + moving.height() / 2, landing.z());
                    const toward = target.minus(here);
                    const remaining = toward.length();
                    if (remaining <= 0.25) { landAt(current, here); return; }
                    const step = Math.min(fallSpeed, remaining);
                    const swept = sweepStep(current, toward.unit().scale(step), sweepRadius);
                    const after = live.observe(actor);
                    const where = after === null ? here.plus(toward.unit().scale(step)) : after.position();
                    scenes.show(current, "fall", where,
                        { moment: "fall", splashes: splashes, scale: scale, intensity: baseIntensity });
                    if (swept.hit.hitEntity()) {
                        const victim = swept.hit.target();
                        if (victim !== null && !live.friendly(victim)) {
                            const facts = live.observe(victim);
                            contact(current, victim, facts === null ? where : facts.position());
                            return;
                        }
                        landAt(current, where);
                        return;
                    }
                    if (swept.hit.blocked() || swept.moved < Math.min(minimumMove, step * 0.4)) { landAt(current, where); return; }
                    current.after(1, fallNow);
                }

                function arcNow(current: CombatAction, index: number): void {
                    if (settled) return;
                    const live = current.world();
                    const moving = live.observe(actor);
                    if (moving === null) { finish(current); return; }
                    if (index >= steps) { landAt(current, moving.position()); return; }
                    const t1 = (index + 1) / steps;
                    const currentFeet = moving.position().minus(up.scale(moving.height() / 2));
                    const delta = arcFeet(t1).minus(currentFeet);
                    if (delta.length() < 0.02) { current.after(1, function (next: CombatAction) { arcNow(next, index + 1); }); return; }
                    const swept = sweepStep(current, delta, sweepRadius);
                    const after = live.observe(actor);
                    const where = after === null ? moving.position() : after.position();
                    if (t1 <= 0.5) {
                        scenes.stop(current, "fall");
                        scenes.show(current, "rise", where,
                            { moment: "rise", rise: leap, splashes: splashes, scale: scale, intensity: baseIntensity });
                    } else {
                        scenes.stop(current, "rise");
                        scenes.show(current, "fall", where,
                            { moment: "fall", splashes: splashes, scale: scale, intensity: baseIntensity });
                    }
                    if (swept.hit.hitEntity()) {
                        const victim = swept.hit.target();
                        if (victim !== null && !live.friendly(victim)) {
                            const facts = live.observe(victim);
                            contact(current, victim, facts === null ? where : facts.position());
                            return;
                        }
                    }
                    // 撞方块的接触：上升段提前转入下落，下落段直接落在实际到达处。
                    if (swept.hit.blocked()) {
                        if (t1 <= 0.5) { fallNow(current); return; }
                        landAt(current, where);
                        return;
                    }
                    current.after(1, function (next: CombatAction) { arcNow(next, index + 1); });
                }

                arcNow(current, 0);
            }

            sound(action, "minecraft:item.trident.riptide_1");
            beginDive(action);
        }
    });

    // 玩家按住技能键连续点选落点、每钻之间可换点（也可只选一次让三钻朝同一处）；AI 提交仍带一个目标，读同一条控制输入。
    WorldCombat.preview("world_combat:tripledive", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
