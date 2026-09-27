/**
 * 伏特替换 / voltswitch 的出手方式。
 *
 * 核心念头：一次跳闸——把一道电弧钉向瞄向的实体或位置，然后顺着电流把自己「切换」到落点：不是跑过去，是瞬间出现。
 *   三道折返里只有它是远程、特殊、且用瞬移换位。
 *
 * 三幕：
 *   起（charge，提交前）：身体表面电荷聚起、落点方向先亮起一个接地的光点，只播预告。
 *   放（bolt，提交后）：一道电弧沿瞄准方向飞出，命中非友方活体才结算 volt 特殊伤害；空放、碰墙、到期都照常撤离。
 *   切（switch／arrive，提交后）：自己瞬间出现在核对过安全空间的落点（有伙伴在附近就落到他身后），一次施放只换位一次。
 *   换（relay 关闭）：有合法后备时，在原生的队伍操作下收回自己、让后备登场。
 *
 * 与同族分开：急速折返走一条 U 回到自己一侧，快速折返越过目标；伏特替换不接触、是特殊伤害，用瞬移换位。
 *   提交前只观察、只 `present`；命中、瞬移、换手都在提交后写。
 *
 * 落点安全：目标落点以当前脚底为起点、沿眨眼预算推进，逐点检查真实支撑与原生空域探针；找不到就原地收招，
 *   不再拿未核对的脚点兜底。表现只画真实起终点的电闪，不假装粒子沿路径逐段移动。
 */
namespace PokemonSkills {
    const voltswitchScene = "world_combat:move_voltswitch";
    const voltswitchRelayText = "world_combat.move.voltswitch.text.relay";
    const voltswitchSwitchText = "world_combat.move.voltswitch.text.switch";
    const voltswitchMissText = "world_combat.move.voltswitch.text.miss";

    /** 切换锚点：`rally` 内最近的伙伴背后；没有伙伴就朝来路的反方向跳开并横向偏出。 */
    function voltswitchLanding(world: CombatWorld, actor: CombatActor, origin: CombatPoint, heading: CombatPoint, lateral: CombatPoint,
        blink: number, arc: number, rally: number): { point: CombatPoint; relayed: boolean } {
        const actors = world.query(origin, rally, false);
        let ally: CombatPoint | null = null, best = Infinity;
        for (let index = 0; index < actors.length; index++) {
            const other = actors[index];
            if (String(other.ref()) === String(actor.ref()) || !world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.health() <= 0) continue;
            const score = body.position().minus(origin).length();
            if (score < best) { best = score; ally = body.position(); }
        }
        if (ally !== null) return { point: ally.plus(heading.scale(-1.3)), relayed: true };
        return { point: origin.minus(heading.scale(blink)).plus(lateral.scale(arc)), relayed: false };
    }

    /** 真实支撑：脚底正下方一格是实心方块才算站得住；incline 处或悬空则不算。 */
    function voltswitchSupported(world: CombatWorld, feet: CombatPoint): boolean {
        const below = world.block(WorldCombat.point(Math.floor(feet.x()), Math.floor(feet.y() - 0.6), Math.floor(feet.z())));
        if (below === null) return false;
        const id = String(below.id());
        return id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air"
            && id !== "minecraft:water" && id !== "minecraft:lava" && id !== "minecraft:bedrock" && id !== "minecraft:barrier";
    }

    /**
     * 在 blink 预算内、从当前脚底朝目标落点由远及近找一块有真支撑、原生空域探针确认站得下的脚底点；
     * 落点高度随目标点插值，因此异高伙伴与抬高/下沉的地面都按真实位置核对；找不到返回 null，调用方原地收招。
     */
    function voltswitchSafeSpot(world: CombatWorld, from: CombatPoint, to: CombatPoint, width: number, height: number): CombatPoint | null {
        if (!LivingActions.hasFreeSpace(world)) return null;
        const delta = to.minus(from), length = delta.length();
        if (!(length > 0.01) || !isFinite(length)) return null;
        const direction = delta.unit();
        for (let step = length; step >= 0.5; step -= 0.5) {
            const feet = from.plus(direction.scale(step));
            if (!voltswitchSupported(world, feet)) continue;
            if (LivingActions.freeSpace(world, feet, width, height)) return feet;
        }
        return null;
    }

    function voltswitchBlink(current: CombatAction, actor: CombatActor, relay: boolean, motes: number, scale: number): boolean {
        const world = current.world(), body = world.observe(actor);
        if (body === null) return false;
        const heading = aim(current), lateral = WorldCombat.point(-heading.z(), 0, heading.x());
        const origin = body.position();
        const blink = p("voltswitch", "blink", current), arc = p("voltswitch", "arc", current), rally = p("voltswitch", "rally", current);
        const anchor = voltswitchLanding(world, actor, origin, heading, lateral, blink, arc, rally);
        const feet = WorldCombat.point(origin.x(), origin.y() - body.height() / 2, origin.z());
        const anchorFeet = WorldCombat.point(anchor.point.x(), anchor.point.y() - body.height() / 2, anchor.point.z());
        const spot = voltswitchSafeSpot(world, feet, anchorFeet, body.width(), body.height());
        let landed = origin, moved = false;
        if (spot !== null && world.teleport(actor, spot)) {
            const after = world.observe(actor);
            landed = after !== null ? after.position() : anchor.point;
            moved = true;
        }
        WorldFeedback.emit(world, voltswitchScene, 1, origin,
            { moment: "switch", motes: motes, scale: scale, relayed: anchor.relayed ? 1 : 0, moved: moved ? 1 : 0 }, 22);
        if (!moved) return false;
        WorldFeedback.emit(world, voltswitchScene, 1, landed,
            { moment: "arrive", motes: motes, scale: scale, relayed: anchor.relayed ? 1 : 0 }, 22);
        if (anchor.relayed) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), voltswitchRelayText, [], 26);
        if (relay) return false;
        // 换手式：有合法后备时在落点收回自己、让后备登场；这就是它真正的脱身方式。
        const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
        if (reserve === null) return false;
        const stand = world.observe(actor);
        const standFeet = stand !== null ? partyFeet(stand) : WorldCombat.point(landed.x(), landed.y(), landed.z());
        return partySwitchOut(world, actor, reserve.slot, standFeet).ok;
    }

    define({
        freeMovement: true,
        id: "voltswitch",
        cooldownParameter: "recharge",
        name: "Volt Switch",
        description: "射出一道电弧钉向瞄向的实体或位置，随即顺着电流瞬移到安全落点；留守式原地留下继续战斗，换手式则与待命的一只换手。空放也能撤离，是三道折返里唯一的远程特殊。",
        uses: ["远程点一下再瞬移，重新找站位", "被打崩前放电脱身", "有后备时顺手换一只能扛的上来"],
        kind: "aim",
        range: 10,
        maxRange: 15,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 28,
        style: "bolt",
        defaults: { relay: true, ai: { maxChase: 12, fleeBelow: 0.4, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("voltswitch", "reach", pokemon), geometry: "line", style: "bolt", color: 0xFFE96A,
                label: config && config.relay === true ? "伏特替换·留守" : "伏特替换·换手" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["voltswitch"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const relay = !!(config && config.relay === true);
            return {
                prepare: Math.round(p("voltswitch", "tempo", context)),
                recover: Math.round(p("voltswitch", "aftercast", context)),
                cooldown: Math.round(p("voltswitch", "recharge", context)) + (relay ? 6 : 0),
                active: 0,
                range: p("voltswitch", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("voltswitch:charge", voltswitchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", relay: config && config.relay === true ? 1 : 0,
                    motes: Math.round(p("voltswitch", "motes", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const power = p("voltswitch", "volt", action);
            const speed = p("voltswitch", "boltSpeed", action);
            const radius = p("voltswitch", "collisionRadius", action);
            const motes = Math.round(p("voltswitch", "motes", action));
            const relay = !!(config && config.relay === true);
            const scale = Math.max(0.6, Math.min(1.9, radius / 0.35));
            const intensity = Math.max(0.6, Math.min(2.2, power / 52));
            let settled = false, blinked = false, flight = "";

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            // 一次施放只换位一次：命中回执、碰墙、到期与自然完成都经过这道门闩。
            function blinkOnce(current: CombatAction): boolean {
                if (blinked) return settled;
                blinked = true;
                const recalled = voltswitchBlink(current, actor, relay, motes, scale);
                if (recalled) settled = true;
                return recalled;
            }

            sound(action, "minecraft:entity.wind_charge.throw");
            flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                appearance: { sprite: "cobblemon:generic/electricity/electricity_yellow", tint: 0xFFE96A, glow: true, scale: scale },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, "voltswitch", power, { damage: damageSpec("voltswitch", "volt") });
                        if (landed) {
                            WorldFeedback.emit(scope, voltswitchScene, 1, hit.position(),
                                { moment: "strike", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 22);
                            sound(current, "cobblemon:impact.electric");
                        } else {
                            // 原生免疫/拒伤：只给接触散气，不播强命中。
                            WorldFeedback.emit(scope, voltswitchScene, 1, hit.position(), { moment: "block", motes: motes, scale: scale }, 20);
                        }
                    } else {
                        // 碰墙：电弧在真实接触面炸开，照样撤离。
                        WorldFeedback.emit(scope, voltswitchScene, 1, hit.position(), { moment: "block", motes: motes, scale: scale }, 20);
                    }
                    if (!blinkOnce(current)) finish(current);
                }
            }, function (current: CombatAction) {
                // 到期：用真实结束点（projectilePosition），不用施法者原点或满射程假造终点。
                const scope = current.world(), end = scope.projectilePosition(flight);
                const at = end !== null ? end : current.origin();
                WorldFeedback.emit(scope, voltswitchScene, 1, at, { moment: "miss", motes: motes, scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1, 0)), voltswitchMissText, [], 20);
                if (!blinkOnce(current)) finish(current);
            });
            // 表现绑在这道动作拥有的电弧上，动作结束即随动作清理，不再独立漂满 60 刻。
            action.present("voltswitch:bolt", voltswitchScene, 1, action.origin(),
                JSON.stringify({ moment: "bolt", projectile: flight, motes: motes, scale: scale, intensity: intensity }));
        }
    });
}
