/**
 * 三连钻 / tripledive 的出手方式。
 *
 * 核心念头：自己连续三次短跳扎下——每一跳是一段真实的身体短弧：从当刻站位起跳、升到 `leap` 高、沿当刻自由瞄准的落点扎下去。
 *   弧终点纳入真实支撑 Y：找不到可站地面就缩短横移，绝不拿起跳原 Y 冒充地面。上升段穿过敌体不计钻（身体用位移越过），
 *   只有下降首次碰到敌体、或真正落地后水花范围内有通视的敌人才结算这一钻。两跳之间重新读取瞄准，所以能换下一落点、
 *   换成另一个敌人，也可以空跳换位。
 *
 * 三钻（提交后由本招自己驱动）：
 *   起（windup，提交前）：屈膝收身，脚下水光打转，只播预告。
 *   钻（execute）：按 `interval` 起三次。每次先用 `triplediveAim` 取当刻自由瞄准点，水平方向限制在 `diveSpan` 内得到落点；
 *       先沿一条经过真实身体逐刻扫掠的短弧上升（`riseSpeed`），越过最高点后沿真实支撑落点下落（`fallSpeed`）。
 *       下落途中第一次非友方敌体接触即结算该钻的 `splash`；落地则按 `diveRadius` 在真实支撑面上扫一次、要求通视。
 *       命中时把共享身份「湿透」（`world_combat:status/soaked`）打到该实体并计时；已经湿透的实体这一钻吃 `soakBonus` 倍。
 *       撞天花板或侧墙就提前沿落点斜坠；停在半空（友体/悬空）不算落地、不补伤。
 *   收（finish）：三钻打完或中途失能，收势并结束。
 *
 * 与同族分开：三连箭是三支箭**同时**离弦、骨头回力镖是**同一根骨头去与回**、三连踢/三旋击是原地扫身前；
 *   三连钻是**固定三下、每下都留下水**的真实起落连钻——它的「三」是死的，价值在那层越叠越重的湿身。
 *
 * 配置 `plunge` 由 resolve 改时序、由公式改跳跃／威力／判定，提交后才触碰世界。
 */
namespace PokemonSkills {
    const triplediveScene = "world_combat:move_tripledive";
    const triplediveSoaked = "world_combat:tripledive_soaked";
    const triplediveSoakEffect = "world_combat:tripledive_soak";
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

    /** 一处真实可站支撑的顶面高度；找不到可站方块时返回 null，调用方不得拿别的 Y 冒充。 */
    function triplediveSupport(world: CombatWorld, x: number, y: number, z: number): number | null {
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return null;
        const hit = SurfacePaths.support(world, WorldCombat.point(x, y + 0.05, z), 0.6, 10);
        return hit === null ? null : hit.y();
    }

    /** 湿身画面绑在这次施放自己的托管效果上：载体被清除/刷新时，托管效果结束，画面同刻收回。 */
    function triplediveSoakVisual(effect: CombatEffect, data: any): void {
        const world = effect.world(), victim = effect.target(), body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.onEffect(world, effect.id(), "tripledive:soak:" + String(victim.ref()), triplediveScene, 1, body.position(),
            { moment: "linger", target: String(victim.ref()), splashes: data.splashes, scale: data.scale, intensity: data.intensity, bonus: data.bonus });
    }

    WorldCombat.effect(triplediveSoakEffect, 1, 400, "actor", function (json) {
        const value = JSON.parse(json);
        ["ticks", "splashes", "scale", "intensity", "bonus"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid tripledive soak state");
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    WorldCombat.effectHandler(triplediveSoakEffect, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const carrier = MobEffects.apply(world, victim, triplediveSoaked, data.ticks, 0);
        if (carrier === null) { effect.end(); return; }
        data.anchor = MobEffects.anchor(carrier);
        effect.state(JSON.stringify(data));
        triplediveSoakVisual(effect, data);
        effect.schedule("hold", "hold", 2, "{}");
    });

    WorldCombat.effectHandler(triplediveSoakEffect, "hold", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const carrier = MobEffects.read(world, victim, triplediveSoaked);
        // 载体被驱散、被替换（新 revision）或提前清除：这次施放的画面收束，不再跟着一个失效锚。
        if (carrier === null || !data.anchor || String(carrier.key()) !== String(data.anchor.key)) { effect.end(); return; }
        effect.remaining(carrier.duration() < 0 ? 400 : Math.max(1, Math.min(400, carrier.duration())));
        triplediveSoakVisual(effect, data);
        effect.schedule("hold", "hold", 2, "{}");
    });

    WorldCombat.effectHandler(triplediveSoakEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

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
                recover: Math.round(p("tripledive", "aftercast", context)),
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
            const up = WorldCombat.point(0, 1, 0);
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
                const startFeet = self.position().minus(up.scale(self.height() / 2));
                // 起跳时取自由瞄准落点，水平方向限制在 diveSpan 内。
                const aimPoint = triplediveAim(current);
                let flat = WorldCombat.point(aimPoint.x() - startFeet.x(), 0, aimPoint.z() - startFeet.z());
                if (flat.length() < 0.05) {
                    const facing = WorldCombat.point(current.direction().x(), 0, current.direction().z());
                    flat = facing.length() < 0.05 ? WorldCombat.point(0, 0, span) : facing.unit().scale(span);
                } else {
                    flat = flat.unit().scale(Math.min(span, flat.length()));
                }
                // 落点必须在真实支撑上；悬空就缩短横移，最后原地起落。
                let landingY: number | null = null, tx = startFeet.x(), tz = startFeet.z();
                for (let attempt = 0; attempt < 5 && landingY === null; attempt++) {
                    tx = startFeet.x() + flat.x(); tz = startFeet.z() + flat.z();
                    landingY = triplediveSupport(scope, tx, startFeet.y(), tz);
                    if (landingY === null) {
                        flat = flat.scale(0.55);
                        if (flat.length() < 0.1) break;
                    }
                }
                if (landingY === null) { flat = WorldCombat.point(0, 0, 0); tx = startFeet.x(); tz = startFeet.z(); }
                const landing = WorldCombat.point(tx, landingY === null ? startFeet.y() : landingY, tz);
                // 真实低顶：把最高点压到头顶方块以下。
                const base = Math.max(startFeet.y(), landing.y());
                let apexY = base + leap;
                const ceiling = WorldGeometry.blockHit(scope, startFeet.plus(WorldCombat.point(0, 0.3, 0)),
                    startFeet.plus(WorldCombat.point(0, apexY + 0.6, 0)));
                if (ceiling !== null) apexY = Math.min(apexY, ceiling.position().y() - 0.15);
                apexY = Math.max(apexY, base + 0.05);
                const apex = WorldCombat.point((startFeet.x() + landing.x()) / 2, apexY, (startFeet.z() + landing.z()) / 2);
                const riseTicks = Math.max(1, Math.ceil(Math.max(0.05, apexY - startFeet.y()) / riseSpeed));
                let diveDamaged = false;

                function arcPoint(from: CombatPoint, to: CombatPoint, t: number): CombatPoint {
                    return WorldCombat.point(from.x() + (to.x() - from.x()) * t,
                        from.y() + (to.y() - from.y()) * t,
                        from.z() + (to.z() - from.z()) * t);
                }

                /** 一次接触：真正落地或下落碰到非友方时结算；伤害被拒绝不算命中、也不刷新湿透。 */
                function contact(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                    if (diveDamaged) return;
                    diveDamaged = true;
                    scenes.stop(current, "rise");
                    scenes.stop(current, "fall");
                    const live = current.world();
                    const victimBody = live.observe(victim);
                    const wasWet = CombatStatus.has(live, victim, "soaked") || (victimBody !== null && victimBody.wet());
                    const power = splash * (wasWet ? soakBonus : 1);
                    const intensity = Math.max(0.6, Math.min(2.4, power / 15));
                    const landed = hurt(current, victim, "tripledive", power, { damage: damageSpec("tripledive", "splash"), contact: true });
                    if (landed) {
                        hits++;
                        live.effect(triplediveSoakEffect, victim,
                            JSON.stringify({ ticks: drench, splashes: splashes, scale: scale, intensity: intensity, bonus: wasWet ? 1 : 0 }), drench);
                        WorldFeedback.emit(live, triplediveScene, 1, at,
                            { moment: "splash", target: String(victim.ref()), soak: wasWet ? 1 : 0,
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

                /** 落到实际到达处：先确认真的踩在支撑上，再按真实身体箱在落地水花半径内找最近、通视的非友方。 */
                function landAt(current: CombatAction, at: CombatPoint): void {
                    if (diveDamaged) { advance(current); return; }
                    scenes.stop(current, "rise");
                    scenes.stop(current, "fall");
                    const live = current.world();
                    const me = live.observe(actor);
                    const feet = me === null ? at : me.position().minus(up.scale(me.height() / 2));
                    const support = triplediveSupport(live, feet.x(), feet.y(), feet.z());
                    const grounded = support !== null && Math.abs(feet.y() - support) <= 0.7;
                    if (!grounded) {
                        // 悬空或被友体/侧墙停在半空：不假落地、不隔墙补伤。
                        WorldFeedback.text(live, feet.plus(WorldCombat.point(0, 1.1, 0)), triplediveMissText, [cast + 1], 22);
                        advance(current);
                        return;
                    }
                    scenes.show(current, "land", feet,
                        { moment: "land", scale: scale, intensity: baseIntensity });
                    let victim: CombatActor | null = null, best = Infinity;
                    WorldGeometry.selectBodies(live, WorldGeometry.bodySphere(at, radius), function (other, facts) {
                        if (String(other.ref()) === String(actor.ref())) return;
                        if (facts.friendly()) return;
                        const gap = facts.position().minus(at).length();
                        if (gap > radius || gap >= best) return;
                        if (WorldGeometry.blockHit(live, at, live.closestPoint(other, at)) !== null) return;
                        best = gap; victim = other;
                    });
                    if (victim !== null) {
                        const facts = live.observe(victim);
                        contact(current, victim, facts === null ? at : facts.position());
                        return;
                    }
                    WorldFeedback.emit(live, triplediveScene, 1, feet,
                        { moment: "land", scale: scale, intensity: baseIntensity }, 16);
                    WorldFeedback.text(live, feet.plus(WorldCombat.point(0, 1.1, 0)), triplediveMissText, [cast + 1], 22);
                    advance(current);
                }

                /** 上升段：身体用位移越过（穿过敌体不计钻），撞墙/顶棚则从中途转入下落。 */
                function ascend(current: CombatAction, index: number): void {
                    if (settled || diveDamaged) return;
                    const live = current.world();
                    const me = live.observe(actor);
                    if (me === null) { finish(current); return; }
                    if (index >= riseTicks) { startFall(current); return; }
                    const feet = me.position().minus(up.scale(me.height() / 2));
                    const delta = arcPoint(startFeet, apex, (index + 1) / riseTicks).minus(feet);
                    if (delta.length() < 0.02) { current.after(1, function (next: CombatAction) { ascend(next, index + 1); }); return; }
                    const moved = live.displace(actor, delta);
                    const after = live.observe(actor);
                    const where = after === null ? me.position() : after.position();
                    scenes.stop(current, "fall");
                    scenes.show(current, "rise", where,
                        { moment: "rise", rise: leap, splashes: splashes, scale: scale, intensity: baseIntensity });
                    if (moved < delta.length() * 0.5) { startFall(current); return; }
                    current.after(1, function (next: CombatAction) { ascend(next, index + 1); });
                }

                function startFall(current: CombatAction): void {
                    const live = current.world();
                    const me = live.observe(actor);
                    if (me === null) { finish(current); return; }
                    const feet = me.position().minus(up.scale(me.height() / 2));
                    const ticks = Math.max(1, Math.ceil(Math.max(0.05, feet.y() - landing.y()) / fallSpeed));
                    descend(current, feet, ticks, 0);
                }

                /** 下降段：身体扫掠，首碰真实敌体即结算，撞墙则落在实际到达处。 */
                function descend(current: CombatAction, fromFeet: CombatPoint, ticks: number, index: number): void {
                    if (settled || diveDamaged) return;
                    const live = current.world();
                    const me = live.observe(actor);
                    if (me === null) { finish(current); return; }
                    if (index >= ticks) { landAt(current, me.position()); return; }
                    const feet = me.position().minus(up.scale(me.height() / 2));
                    const delta = arcPoint(fromFeet, landing, (index + 1) / ticks).minus(feet);
                    if (delta.length() < 0.02) { current.after(1, function (next: CombatAction) { descend(next, fromFeet, ticks, index + 1); }); return; }
                    const swept = sweepStep(current, delta, sweepRadius);
                    const after = live.observe(actor);
                    const where = after === null ? me.position() : after.position();
                    scenes.stop(current, "rise");
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
                    if (swept.hit.blocked() || swept.moved < Math.min(minimumMove, delta.length() * 0.4)) { landAt(current, where); return; }
                    current.after(1, function (next: CombatAction) { descend(next, fromFeet, ticks, index + 1); });
                }

                ascend(current, 0);
            }

            sound(action, "minecraft:item.trident.riptide_1");
            beginDive(action);
        }
    });

    // 玩家按住技能键连续点选落点、每钻之间可换点（也可只选一次让三钻朝同一处）；AI 提交仍带一个目标，读同一条控制输入。
    WorldCombat.preview("world_combat:tripledive", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
