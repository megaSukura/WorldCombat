/**
 * 伏特替换 / voltswitch 的出手方式与余电场。
 *
 * 核心念头：一次跳闸——把一道电弧钉在目标身上，然后顺着电流把自己「切换」到落点：不是跑过去，是瞬间出现；
 *   原地留下一小片还在嗡嗡响的电荷。三道折返里只有它是远程、特殊、且用瞬移换位。
 *
 * 三幕：
 *   起（charge，提交前）：身体表面电荷聚起、毛刺立起，落点方向先亮起一个接地的光点，只播预告。
 *   放（bolt，提交后）：一道电弧飞向目标，命中结算 volt 特殊伤害。
 *   切（switch，提交后）：自己瞬间出现在落点（有伙伴在附近就落到他身后），原地留下电荷区（余电式）。
 *   续（zap）：电荷区每 20 刻电击站进去的敌人，到期自行散去。
 *
 * 与同族分开：急速折返走一条 U 回到自己一侧，快速折返越过目标；伏特替换不接触、是特殊伤害，用瞬移换位，
 *   还可能留下带电的地面。提交前只观察、只 `present`；命中、瞬移、余电都在提交后写。
 */
namespace PokemonSkills {
    const voltswitchScene = "world_combat:move_voltswitch";
    const voltswitchField = "world_combat:field/voltswitch";
    const voltswitchRelayText = "world_combat.move.voltswitch.text.relay";
    const voltswitchSwitchText = "world_combat.move.voltswitch.text.switch";

    // 余电：留在原地的电荷区每 `interval` 刻电击范围内的非友方，按 `zap` 结算固定伤害。
    WorldEffects.fieldRule(voltswitchField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null || body.health() <= 0) return;
            const interval = Math.max(10, Math.round(Number(field.data && field.data.interval) || 20));
            const next = field.data.next || (field.data.next = {});
            const ref = String(actor.ref());
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + interval;
            const zap = Math.max(1, Number(field.data && field.data.zap) || 2);
            world.hurt(actor, zap, JSON.stringify({ kind: "move", move: "voltswitch", type: "electric", category: "special",
                cause: "world_combat:voltswitch_relay", bypassCooldown: true, action: 0 }));
            WorldFeedback.emit(world, voltswitchScene, 1, body.position(),
                { moment: "zap", target: ref, motes: Math.max(4, Math.round(zap * 2)) }, 16);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            WorldFeedback.keep(world, "voltswitch:field:" + effect.id(), voltswitchScene, 1, centre,
                { moment: "field", radius: field.radius, scale: Math.max(0.5, Math.min(2.0, field.radius / 2.8)),
                    motes: Math.round(Number(field.data && field.data.motes) || 16) }, 20);
        }
    });

    /** 切换落点：`rally` 内最近的伙伴背后；没有伙伴就朝来路的反方向跳开并横向偏出。 */
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

    /** 位移单次上限 4 格，超出时拆成几步走完。 */
    function voltswitchShove(world: CombatWorld, actor: CombatActor, delta: CombatPoint): void {
        let remaining = delta, guard = 0;
        while (remaining.length() > 0.05 && guard++ < 10) {
            const direction = remaining.unit(), step = Math.min(3.5, remaining.length());
            const moved = world.displace(actor, direction.scale(step));
            if (moved <= 0.01) return;
            remaining = remaining.minus(direction.scale(moved));
        }
    }

    function voltswitchBlink(current: CombatAction, actor: CombatActor, relay: boolean,
        fieldRadius: number, fieldTicks: number, zap: number, interval: number, motes: number): void {
        const world = current.world(), body = world.observe(actor);
        if (body === null) return;
        const heading = aim(current), lateral = WorldCombat.point(-heading.z(), 0, heading.x());
        const origin = body.position();
        const blink = p("voltswitch", "blink", current), arc = p("voltswitch", "arc", current), rally = p("voltswitch", "rally", current);
        const landing = voltswitchLanding(world, actor, origin, heading, lateral, blink, arc, rally);
        const feet = WorldCombat.point(landing.point.x(), landing.point.y() - body.height() / 2, landing.point.z());
        if (!world.teleport(actor, feet))
            voltswitchShove(world, actor, WorldCombat.point(feet.x() - origin.x(), 0, feet.z() - origin.z()));
        const after = world.observe(actor);
        const landed = after !== null ? after.position() : landing.point;
        WorldFeedback.emit(world, voltswitchScene, 1, origin, {
            moment: "switch", motes: motes, relayed: landing.relayed ? 1 : 0, relay: relay ? 1 : 0,
            path: [[origin.x(), origin.y() - body.height() / 2, origin.z()], [landed.x(), landed.y() - body.height() / 2, landed.z()]]
        }, 24);
        if (landing.relayed) WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.1, 0)), voltswitchRelayText, [], 26);
        if (relay) {
            WorldEffects.field(world, voltswitchField, origin, fieldRadius,
                { zap: zap, interval: interval, motes: motes, owner: String(actor.ref()) }, fieldTicks);
            WorldFeedback.emit(world, voltswitchScene, 1, origin,
                { moment: "residue", radius: fieldRadius, scale: Math.max(0.5, Math.min(2.0, fieldRadius / 2.8)), motes: motes }, 30);
        } else {
            // 直放式（余电式关闭）：原地不留东西，换人就是它真正的脱身方式。
            const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
            if (reserve !== null) {
                const stand = world.observe(actor);
                const feet = stand === null ? landed : partyFeet(stand);
                WorldFeedback.text(world, landed.plus(WorldCombat.point(0, 1.1, 0)), voltswitchSwitchText, [], 26);
                partySwitchOut(world, actor, reserve.slot, feet);
            }
        }
    }

    define({
        id: "voltswitch",
        name: "Volt Switch",
        description: "射出一道电弧钉在目标身上，随即顺着电流瞬移到落点；余电式留在原地布下电荷区，直放式则与待命的一只换手。",
        uses: ["远程点一下再瞬移，重新找站位", "被打崩前放电脱身", "在原地留一片电荷封住走位"],
        kind: "enemy",
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
                label: config && config.relay === true ? "伏特替换·余电" : "伏特替换" };
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
            const fieldRadius = p("voltswitch", "fieldRadius", action);
            const fieldTicks = Math.max(40, Math.round(p("voltswitch", "fieldTicks", action)));
            const zap = p("voltswitch", "zap", action);
            const scale = Math.max(0.6, Math.min(1.9, radius / 0.35));
            const intensity = Math.max(0.6, Math.min(2.2, power / 52));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.wind_charge.throw");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                appearance: { sprite: "cobblemon:generic/electricity/electricity_yellow", tint: 0xFFE96A, glow: true, scale: scale },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target();
                    let landed = false;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim))
                        landed = impact(current, hit, "voltswitch", power, { damage: damageSpec("voltswitch", "volt") });
                    WorldFeedback.emit(scope, voltswitchScene, 1, hit.position(),
                        { moment: "strike", target: victim !== null ? String(victim.ref()) : "",
                            motes: motes, scale: scale, intensity: intensity, landed: landed ? 1 : 0 }, 22);
                    sound(current, "cobblemon:impact.electric");
                    voltswitchBlink(current, actor, relay, fieldRadius, fieldTicks, zap, 20, motes);
                    finish(current);
                }
            }, function (current: CombatAction) {
                const scope = current.world(), at = current.origin();
                WorldFeedback.emit(scope, voltswitchScene, 1, at,
                    { moment: "miss", motes: motes, scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1, 0)), "world_combat.move.voltswitch.text.miss", [], 20);
                voltswitchBlink(current, actor, relay, fieldRadius, fieldTicks, zap, 20, motes);
                finish(current);
            });
            WorldFeedback.keep(world, "voltswitch:flight:" + action.id(), voltswitchScene, 1, action.origin(),
                { moment: "bolt", projectile: flight, motes: motes, scale: scale, intensity: intensity }, 60);
        }
    });
}
