/**
 * 冷笑话 / chillyreception 的出手方式。
 *
 * 念头的形状（两幕接一段持续）：
 *  1) 冷场——施法者清一下嗓子、把一句冷到没人接得住的话抛出去（windup：嘴边浮起细霜与悬着的话音）；
 *     提交后话音落下，身边一圈的敌人接到一次**可被正常免疫的短打断**（`world.deliver` 的 interrupt 事件，
 *     无法打断的动作照常继续），并挂上「冷场」身份；雪花随之在施法者周围落下。
 *  2) 交接——施法者趁这片安静退到场内一处**远离最近威胁、原生探针确认能站立**的落点：
 *     有合法后备就收回自己、让后备在同一点登场；没有后备就只撤一步、留在场上。
 *  3) 雪停——留在原地的雪区到期散去（detachedField 到期）。
 *
 * 提交前只播预告；雪区（WorldEffects.detachedField，挂在自持 body 上）与退场都在提交后写。
 * 核心退场不依赖硬控成功：即使所有敌人都免疫打断，退开与换手照常发生。
 */
namespace PokemonSkills {
    /**
     * 退场点：优先背离最近的敌人，再用原生 free-space 探针（脚底中心、按体型）确认能站立。
     * 沿背离方向从最远往回试，第一个站得住的点胜出；都站不住返回 null。
     */
    function chillyExit(world: CombatWorld, actor: CombatActor, body: CombatObservation, distance: number): CombatPoint | null {
        if (!(distance > 0) || !LivingActions.hasFreeSpace(world)) return null;
        const centre = body.position();
        const actors = world.query(centre, 24, false);
        let found = false, nearest = 0, awayX = 0, awayZ = 0;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.ref()) === String(actor.ref()) || world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null) continue;
            const dx = facts.position().x() - centre.x(), dz = facts.position().z() - centre.z();
            const square = dx * dx + dz * dz;
            if (!found || square < nearest) { found = true; nearest = square; awayX = dx; awayZ = dz; }
        }
        let headingX = 1, headingZ = 0;
        if (found) {
            const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
            if (length >= 0.01) { headingX = -awayX / length; headingZ = -awayZ / length; }
        }
        const feet = centre.minus(WorldCombat.point(0, body.height() / 2, 0));
        const width = Math.max(0.3, body.width()), height = Math.max(0.5, body.height());
        for (let step = distance; step >= 0.5; step -= 0.5) {
            const candidate = WorldCombat.point(feet.x() + headingX * step, feet.y(), feet.z() + headingZ * step);
            if (world.freeSpace(candidate, width, height)) return candidate;
        }
        return null;
    }

    define({
        freeMovement: true,
        id: "chillyreception",
        name: "冷笑话",
        description: "抛出一句冷笑话，给身边一圈的敌人一次可被免疫的短打断、并留下会持续一段时间的雪区，自己趁势退到场内一个背向威胁、站得住的落点；有后备时直接与待命的一只在同一点换手，没有后备就只撤一步。",
        uses: ["被围住时开一条退路", "打断身边几个敌人一次", "退场前顺手把雪留在原地"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 160,
        style: "cold",
        defaults: { punchline: false },
        fields: [flag("punchline", "重梗冷场")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("chillyreception", "silenceRadius", pokemon) : 7, geometry: "area", style: "cold",
                color: 0xB8C4D0, label: config && config.punchline ? "重梗冷场" : "轻描淡写" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["chillyreception"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const punchline = !!(config && config.punchline);
            return {
                prepare: Math.max(6, Math.round(p("chillyreception", "gather", context))),
                recover: Math.max(4, Math.round(p("chillyreception", "settle", context))),
                cooldown: Math.max(60, p("chillyreception", "cooldown", context) + (punchline ? 18 : -12)),
                active: skills["chillyreception"].active,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_chillyreception:windup", chillyScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("chillyreception", "silenceRadius", action), punchline: config && config.punchline ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const point = body.position();
            const silenceRadius = p("chillyreception", "silenceRadius", action);
            const hush = Math.max(20, Math.round(p("chillyreception", "hushTicks", action)));
            const snowRadius = p("chillyreception", "snowRadius", action);
            const snowTicks = Math.max(80, Math.round(p("chillyreception", "snowTicks", action)));
            const density = Math.round(p("chillyreception", "snowDensity", action));
            const withdraw = p("chillyreception", "withdraw", action);
            WorldEnvironment.replaceOwnWeather(world, actor);
            const targets = world.query(point, silenceRadius, false);
            let hushed = 0;
            for (let i = 0; i < targets.length; i++) {
                const other = targets[i];
                if (String(other.ref()) === String(actor.ref()) || world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                // 一次短打断：走动作自己的 interrupt 事件，无法打断/免疫的动作照常继续。
                const stopped = world.deliver(other, "world_combat:interrupt");
                MobEffects.apply(world, other, chillySilence, hush, 0);
                if (stopped) {
                    WorldFeedback.emit(world, chillyScene, 1, facts.position(),
                        { moment: "silence", target: String(other.ref()), scale: silenceRadius / 7 }, 24);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1, 0)), chillyHushText, [], 24);
                    hushed++;
                }
            }
            // 雪区挂在自持的临时 body 上：施法者被换下/收回后雪仍留在原地。
            WorldEffects.detachedField(world, chillyField, point, snowRadius, { density: density, hush: hush }, snowTicks);
            WorldFeedback.emit(world, chillyScene, 1, point,
                { moment: "burst", radius: silenceRadius, scale: silenceRadius / 7, density: density, hushed: hushed, snowTicks: snowTicks }, 44);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), chillyJokeText, [hushed], 30);

            const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
            const exit = chillyExit(world, actor, body, withdraw);
            if (reserve !== null) {
                // 有后备：退到站得住的退场点，旧施法者在那里鞠躬消失，后备在同一点入场。
                if (exit !== null) world.teleport(actor, exit);
                const stand = world.observe(actor);
                const at = stand === null ? point : stand.position();
                const feet = stand !== null ? partyFeet(stand) : exit !== null ? exit : partyFeet(body);
                WorldFeedback.emit(world, chillyScene, 1, at,
                    { moment: "bow", radius: withdraw, scale: silenceRadius / 7, escaped: exit !== null ? 1 : 0 }, 26);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.4, 0)), chillyBowText, [], 26);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), chillySwitchText, [], 26);
                partySwitchOut(world, actor, reserve.slot, feet);
            } else {
                // 没有后备：只撤一步，不换手。原生单次位移上限 4 格，退场点再远也只走这一步。
                if (exit !== null) {
                    const feet = partyFeet(body);
                    const delta = WorldCombat.point(exit.x() - feet.x(), 0, exit.z() - feet.z());
                    if (delta.length() > 0.01) world.displace(actor, delta.unit().scale(Math.min(4, delta.length())));
                }
                const stand = world.observe(actor);
                const at = stand === null ? point : stand.position();
                WorldFeedback.emit(world, chillyScene, 1, at,
                    { moment: "bow", radius: withdraw, scale: silenceRadius / 7, escaped: 0 }, 26);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.4, 0)), chillyBowText, [], 26);
            }
            MobEffects.apply(world, actor, chillySnow, Math.max(40, hush), 0);
            world.sound("cobblemon:move.powdersnow.actor", point, 24, "{}");
            done(action);
        }
    });
}
